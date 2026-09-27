import mongoose,{isValidObjectId} from "mongoose"
import { Comment } from "../models/comment.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }
        const videoComment = await Comment.aggregate([
            {
                  $match: {
                                video: new mongoose.Types.ObjectId(videoId)
                            }
            },{
                $lookup:{
                    from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails"
                }
            },{
                    $unwind : "$ownerDetails"
            },{
                $skip:(page - 1) * limit
            },{
                $limit: Number(limit)
            },{
    $project: {
        content: 1,      // 1 means "Yes, include this field"
        createdAt: 1,    // Include the date it was created
        
        // We only want specific fields from ownerDetails
        "ownerDetails.username": 1,
        "ownerDetails.avatar": 1
    }
            }
        ])

        return res.status(200).json(new ApiResponse(200, videoComment, "comment shown successfully"))


})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const { videoId } = req.params
    const {comment} = req.body
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }
    if (!comment) {
        throw new ApiError(400, "Invalid comment")
    }
    const addedComment = await Comment.create({
        owner: req.user?._id,
        content: comment,
        video: videoId
    })
    if (!addedComment) {
        throw new ApiError(400, "write/add comment")
    }
    return res.status(201).json(new ApiResponse(201, addedComment, "comment added successfully"))
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
   
    const { commentId } = req.params
     const {comment} = req.body
    if ( !isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID")
    }
    if (!comment) {
        throw new ApiError(400, "Invalid comment")
    }
   const commentToUpdate  = await Comment.findById(commentId)
   if (!commentToUpdate) {
    throw new ApiError(404, "Comment not found")
}
   if (commentToUpdate .owner.toString() !==  req.user?._id.toString()) {
    throw new ApiError(400, "Invalid access")
   }

    const updatedComment = await Comment.findByIdAndUpdate(commentId, 
        { $set: { content:comment } }, { new: true })

            
        
    
    return res.status(200).json(new ApiResponse(200, updatedComment, "comment updated successfully"))


})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.params
    
    if ( !isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID")
    }
   
    const deleting  = await Comment.findById(commentId)
    if (!deleting) {
       throw new ApiError(404, "Comment not found")
   }
   if (deleting .owner.toString() !==  req.user?._id.toString()) {
    throw new ApiError(400, "Invalid access")
   }


const deletedComment = await deleting.deleteOne()

if (!deletedComment) {
 throw new ApiError(404, "Comment not found")
}
            
        
    
    return res.status(200).json(new ApiResponse(200, deleting, "comment deleted successfully"))


})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}