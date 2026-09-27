import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.models.js"
import { Subscription } from "../models/subscription.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"



const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
   if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "incorrect data");
  }
  const subscribed = await Subscription.findOne({
    subscriber:req.user?._id,
    channel:channelId
  })
  if (subscribed) {
   const unsubscribed = await Subscription.findByIdAndDelete(subscribed._id);
   return res.status(200).json(new ApiResponse(200,{},"unsubscribed succesfully"))
  }
  const subscribe = await Subscription.create({
    subscriber:req.user?._id,
    channel:channelId
  });
  
   return res.status(200).json(new ApiResponse(200,{},"subscribed succesfully"))
 

})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
      if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "incorrect data");
  }
  const channelSubs = await Subscription.aggregate([
    {
      $match:{channel: new mongoose.Types.ObjectId(channelId)}
    },{
      $lookup:{
        from: "users",          // The target collection name
        localField: "subscriber",    // The field in the CURRENT document (Subscription)
        foreignField: "_id",  // The field in the TARGET collection (Users)
        as: "subs"
      }
    },{
      $unwind:"$subs"
    }
    ,{
      $project:{
        username:"$subs.username",
        avatar:"$subs.avatar"
      }
    }
  ])
 
return res
  .status(200)
  .json(new ApiResponse(200, channelSubs, "Subscribers fetched successfully"));
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
      if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400, "incorrect data");
  }
  const SubscribedChannels = await Subscription.aggregate([
    {
      $match:{subscriber: new mongoose.Types.ObjectId(subscriberId)}
    },{
      $lookup:{
        from:"users",
        localField:"channel",
       foreignField: "_id",  // The field in the TARGET collection (Users)
        as: "subscribedTo" 
      }
    },{
      $unwind:"$subscribedTo"
    },{
      $project:{
        username:"$subscribedTo.username",
        avatar:"$subscribedTo.avatar",
        
      }
    }
  ])
  return res
  .status(200)
  .json(new ApiResponse(200, SubscribedChannels, "Subscribed Channels fetched successfully"));
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}