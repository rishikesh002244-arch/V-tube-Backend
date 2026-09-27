import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.models.js"
import {User} from "../models/user.models.js"
import {Comment} from "../models/comment.models.js"
import {Like} from "../models/like.models.js"
import {Playlist} from "../models/playlist.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary, deleteFromCloudinary} from "../utils/cloudinary.js"

// @desc    Get all videos based on query, sort, pagination
// @route   GET /api/v1/videos
// @access  Public (or Private depending on requirements)
const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    
    const pipeline = []

    // 1. Filter by userId if provided (Get videos of a specific user)
    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid User ID")
        }
        pipeline.push({
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        })
    }

    // 2. Filter by query (Search by title or description)
    if (query) {
        pipeline.push({
            $match: {
                $or: [
                    { title: { $regex: query, $options: "i" } },
                    { description: { $regex: query, $options: "i" } }
                ]
            }
        })
    }

    // 3. Sort
    const sortField = sortBy || "createdAt"
    const sortOrder = sortType === "asc" ? 1 : -1
    pipeline.push({
        $sort: {
            [sortField]: sortOrder
        }
    })

    // 4. Lookup owner details (Join with User collection)
    pipeline.push({
        $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner",
            pipeline: [
                {
                    $project: {
                        fullName: 1,
                        username: 1,
                        avatar: 1
                    }
                }
            ]
        }
    })

    // 5. Unwind owner array (Since lookup returns an array)
    pipeline.push({
        $addFields: {
            owner: { $first: "$owner" }
        }
    })

    const aggregate = Video.aggregate(pipeline)

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    }

    // Use mongoose-aggregate-paginate-v2
    const videos = await Video.aggregatePaginate(aggregate, options)

    return res
        .status(200)
        .json(new ApiResponse(200, videos, "Videos fetched successfully"))
})

// @desc    Upload video and thumbnail, create video
// @route   POST /api/v1/videos
// @access  Private
const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body

    if (!title || !description) {
        throw new ApiError(400, "Title and description are required")
    }

    // Get file paths from multer
    const videoFileLocalPath = req.files?.videoFile?.[0]?.path
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path

    if (!videoFileLocalPath) {
        throw new ApiError(400, "Video file is required")
    }

    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail is required")
    }

    // Upload to Cloudinary
    const videoFile = await uploadOnCloudinary(videoFileLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if (!videoFile) {
        throw new ApiError(500, "Failed to upload video file to Cloudinary")
    }

    if (!thumbnail) {
        throw new ApiError(500, "Failed to upload thumbnail to Cloudinary")
    }

    // Create video document
    const video = await Video.create({
        title,
        description,
        videoFile: {
            url: videoFile.url,
            public_id: videoFile.public_id
        },
        thumbnail: {
            url: thumbnail.url,
            public_id: thumbnail.public_id
        },
        duration: videoFile.duration, // Cloudinary returns duration
        owner: req.user?._id,
        isPublished: true
    })

    return res
        .status(201)
        .json(new ApiResponse(201, video, "Video published successfully"))
})

// @desc    Get video by id
// @route   GET /api/v1/videos/:videoId
// @access  Public (or Private)
const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video ID")
    }

    // Use aggregation to fetch video and owner details
    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            fullName: 1,
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: { $first: "$owner" }
            }
        }
    ])

    if (!video?.length) {
        throw new ApiError(404, "Video not found")
    }

    // Increment views
    await Video.findByIdAndUpdate(videoId, {
        $inc: { views: 1 }
    })

    return res
        .status(200)
        .json(new ApiResponse(200, video[0], "Video fetched successfully"))
})

// @desc    Update video details (title, description, thumbnail)
// @route   PATCH /api/v1/videos/:videoId
// @access  Private
const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { title, description } = req.body

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video ID")
    }

    if (!title || !description) {
        throw new ApiError(400, "Title and description are required")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    // Check ownership
    if (video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You do not have permission to update this video")
    }

    const thumbnailLocalPath = req.file?.path // Assuming single file upload for update
    let thumbnail;

    if (thumbnailLocalPath) {
        thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
        if (!thumbnail) {
            throw new ApiError(500, "Failed to upload thumbnail to Cloudinary")
        }
        // Delete old thumbnail from Cloudinary
        await deleteFromCloudinary(video.thumbnail.public_id)
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: thumbnail ? { url: thumbnail.url, public_id: thumbnail.public_id } : video.thumbnail
            }
        },
        { new: true }
    )

    return res
        .status(200)
        .json(new ApiResponse(200, updatedVideo, "Video updated successfully"))
})

// @desc    Delete video
// @route   DELETE /api/v1/videos/:videoId
// @access  Private
const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video ID")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    // Check ownership
    if (video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You do not have permission to delete this video")
    }

    // Delete files from Cloudinary
    await deleteFromCloudinary(video.videoFile.public_id)
    await deleteFromCloudinary(video.thumbnail.public_id)

    // Delete from DB
    await Video.findByIdAndDelete(videoId)

    // Delete related comments, likes, and remove from playlists & watch history
    await Comment.deleteMany({ video: videoId })
    await Like.deleteMany({ video: videoId })
    await Playlist.updateMany(
        { videos: videoId },
        { $pull: { videos: videoId } }
    )
    await User.updateMany(
        { watchHistory: videoId },
        { $pull: { watchHistory: videoId } }
    )

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Video deleted successfully"))
})

// @desc    Toggle publish status
// @route   PATCH /api/v1/videos/toggle/publish/:videoId
// @access  Private
const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video ID")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    // Check ownership
    if (video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You do not have permission to toggle publish status")
    }

    video.isPublished = !video.isPublished
    await video.save()

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video publish status toggled successfully"))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}