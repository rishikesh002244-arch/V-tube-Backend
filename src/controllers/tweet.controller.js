import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.models.js"
import { User } from "../models/user.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const { content } = req.body
    if (!content) {
        throw new ApiError(400, "Content is required")
    }

    const tweet = await Tweet.create(
        {
            owner: req.user?._id,
            content: content
        }
    )
    return res.status(201).json(new ApiResponse(201, tweet, "tweet created successfully"))

})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const { userId } = req.params
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID")
    }

    const userTweets = await Tweet.aggregate([
        {
            // Stage 1: Filter by Owner
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            // Stage 2: Join with User Collection (lookup)
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            "avatar.url": 1 // Only get what you need
                        }
                    }
                ]
            }
        },
        {
            // Stage 3: Flatten the ownerDetails array
            $addFields: {
                ownerDetails: {
                    $first: "$ownerDetails"
                }
            }
        },
        {
            // Stage 4: Sort by Newest First
            $sort: {
                createdAt: -1
            }
        }
    ])

    if (!userTweets?.length) {
        return res.status(200).json(new ApiResponse(200, [], "User has no tweets"))
    }
    return res.status(200).json(new ApiResponse(200, userTweets, "User tweets fetched successfully"))

})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const { tweetId } = req.params
    const { content } = req.body
    if (!content) {
        throw new ApiError(400, "Content is required")
    }
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID")
    }

    const updatedTweet = await Tweet.findOneAndUpdate(
        {
            _id: tweetId,
            owner: req.user?._id
        },
        {
            $set: { content }
        },
        { new: true }
    )

    if (!updatedTweet) {
        throw new ApiError(404, "Tweet not found or unauthorized")
    }

    return res.status(200).json(
        new ApiResponse(200, updatedTweet, "Tweet updated successfully")
    )

})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const { tweetId } = req.params

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID")
    }

    const deletedTweet = await Tweet.findOneAndDelete({
        _id: tweetId,
        owner: req.user?._id
    })

    if (!deletedTweet) {
        throw new ApiError(404, "Tweet not found or unauthorized")
    }
    return res.status(200).json(
        new ApiResponse(200, deletedTweet, "Tweet deleted successfully")
    )
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}