import mongoose, { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body
    if (!name || !description) {
        throw new ApiError(400, "name and description required")
    }
    
    const createdPlaylist = await Playlist.create(({
        name,
        description,
        owner: req.user?._id
    }))
    if (!createdPlaylist) {
        throw new ApiError(400, "playlist creation failed")
    }
    return res.status(201).json(new ApiResponse(201, createdPlaylist, "playlist created successfully"))

})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params
    //TODO: get user playlist
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "userId required/Invalid")
    }
  
    const userPlaylists = await Playlist.find({ owner: userId })

    return res.status(200)
        .json(new ApiResponse
            (200, userPlaylists, "playlist fetched successfully"))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    //TODO: get playlist by id
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400,
            "playlistID required/Invalid")
    }
    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(404, "error fetching playlistId ")
    }
     if (playlist.owner.toString() !== req.user?._id.toString())
         throw new ApiError(403, "Not authorized")
    return res.status(200).json(new ApiResponse
        (200, playlist, "playlist fetched successfully"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params
    if (!playlistId || !videoId) {
        throw new ApiError(400,
            "playlistID required/Invalid")
    }
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "playlistId, videoId Invalid")
    }
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "videoId Invalid")
    }
     
    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(404, " can't add video's/error")
    }
    // 4. Authorization Check (The most important part!)
    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You do not have permission to add videos to this playlist")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId,
        { $addToSet: { videos: videoId } }, { new: true }
    )


    return res.status(200).json(new ApiResponse
        (200, updatedPlaylist, "added videos succesfully "))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params
    // TODO: remove video from playlist
    if (!playlistId || !videoId) {
        throw new ApiError(400,
            "playlistID required/Invalid")
    }
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(404, "playlistId, videoId Invalid")
    }
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "videoId Invalid")
    }
    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
         throw new ApiError(404,
            "playlist required/Invalid")
    }
     if (playlist.owner.toString() !== req.user?._id.toString())
         throw new ApiError(403, "Not authorized")

    const removeVideo = await Playlist.findByIdAndUpdate(
         playlistId,              // 1st arg: the ID
    { $pull: { videos: videoId } }, // 2nd arg: the action
        { new: true }  
        
)
return res.status(200).json(new ApiResponse
    (200, removeVideo, "removed videos succesfully "))

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    // TODO: delete playlist
    if (!playlistId) {
        throw new ApiError(400,
            "playlistID required/Invalid")
    }
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "playlistId, videoId Invalid")
    }
    const playlist = await Playlist.findById(playlistId)
      if (!playlist) {
         throw new ApiError(404,
            "playlist required/Invalid")
    }
   // Add this line after your if (!playlist) check
if (playlist.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You don't have permission to delete this playlist");
}

    const delPlaylist = await Playlist.findByIdAndDelete(playlistId)
    return res.status(200).json(new ApiResponse
        (200, delPlaylist, "removed playlist succesfully "))
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    const { name, description } = req.body
    //TODO: update playlist
     if (!playlistId) {
        throw new ApiError(400,
            "playlistID required/Invalid")
    }
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "playlistId, videoId Invalid")
    }
     if (!name || !description) {
        throw new ApiError(400,
            "playlistID required/Invalid")
    }
    const playlist = await Playlist.findById(playlistId)
        if (!playlist) {
         throw new ApiError(404,
            "playlist required/Invalid")
    }
   // Add this line after your if (!playlist) check
if (playlist.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You don't have permission to update this playlist");
}

    const updatedPlaylist = await Playlist.findByIdAndUpdate(

         playlistId,              // 1st arg: the ID
    {$set: { name, description }}, // 2nd arg: the action
        { new: true }  
    ) 
  return res.status(200).json(new ApiResponse
    (200, updatedPlaylist, "updated videos succesfully "))

})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}