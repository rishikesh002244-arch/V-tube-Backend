import { asyncHandler } from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import{User} from "../models/user.models.js"
import {deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"



const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
       const accessToken =  user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave:false})
        return {accessToken,refreshToken}
    } catch (error) {
         throw new ApiError(500,"something went worng while generating Access And Refresh Token")
    }
}






const registerUser = asyncHandler(async (req,res) => {
   const {fullname,email,username,password} = req.body

   //validation
   if([fullname,email,username,password]
    .some((field) =>field?.trim() === "" || field === undefined)){
       throw new ApiError(400,"all fields are  required")
    }
    
    const existedUser = await User.findOne(
        {
            $or:[{username},{email}]
        })
        
        if (existedUser) {
            throw new ApiError(409,"user with email or username already exists ")
            
    }
    const avatarLocalPath = req.files?.avatar?.[0]?.path
    const coverLocalPath = req.files?.coverImage?.[0]?.path

    if(!avatarLocalPath){
            throw new ApiError(400,"Avatar file is missing")
    }


//     const avatar = await uploadOnCloudinary(avatarLocalPath)
//    let coverImage = ""
//    if (coverLocalPath) {
//      coverImage = await uploadOnCloudinary(coverImage)
//    }


let avatar;
try {
    avatar = await uploadOnCloudinary(avatarLocalPath)
    console.log("uploaded Avatar",avatar);
    
} catch (error) {
    console.log("error uploading avatar",error)
    throw new ApiError(500,"Failed to upload avatar")
}

if (!avatar) {
    throw new ApiError(400, "Avatar file is required or upload failed")
}

let coverImage;
try {
    coverImage = await uploadOnCloudinary(coverLocalPath)
    console.log("uploaded coverImage",coverImage);
    
} catch (error) {
    console.log("error uploading avatar",error)
    throw new ApiError(500,"Failed to upload coverImage")
}

   try {
     const   user = await User.create({
    fullname,
    avatar:avatar.url,
    coverImage:coverImage?.url || "",
    email,
    password,
    username:username.toLowerCase()
   })
        const createdUser = await User.findById(user._id).select(
            "-password -refreshToken "
        )

if(!createdUser){
 throw new ApiError(500,"something went worng while registering a user")
}

return res.status(201)
.json(new ApiResponse(200,createdUser,"user regestered suddessfully"))



   } catch (error) {
    console.log("User creation failed", error);
    if (avatar) {
        await deleteFromCloudinary(avatar.public_id)
    }
    if (coverImage) {
        await deleteFromCloudinary(coverImage.public_id)
    }
     throw new 
     ApiError(500,
        "something went worng while registering a user and images were deleted")
   }
})

const loginUser = asyncHandler( async (req,res ) => {
    //get data from body
    const {username,password,email} = req.body

    //validation
    if (!email || !username || !password) {
        throw new ApiError(400,"email is rerequired")
    }
     const user = await User.findOne(
        {
            $or:[{username},{email}]
        })
        if (!user) {
             throw new ApiError(404," user not found")
        }
        //validate password
        const isPasswordvalid = await user.isPasswordCorrect(password)
        if (!isPasswordvalid) {
             throw new ApiError(404," invalid user credentials")
        }



        const   {accessToken,refreshToken} = await 
        generateAccessAndRefreshToken(user._id)

        const loggedInUser = await User.findById(user._id)
        .select("-password -refreshToken")

const options = {
    httpOnly:true,
    secure:process.env.NODE_ENV  === "production",

}        
return res
.status(200)
.cookie("accessToken",accessToken,options)
.cookie("refreshToken",refreshToken,options)
.json(new ApiResponse(200,
    {user:accessToken,refreshToken,loggedInUser},
    "User logged in successfully"
))
})


const logoutUser = asyncHandler( async (req,res ) => {

    await User.findByIdAndUpdate(
      req.user._id,{
        $set:{
            refreshToken:undefined,
        }
      },{new:true}
    )

    
const options = {
    httpOnly:true,
    secure:process.env.NODE_ENV  === "production",

}
return res
            .status(200)
            .clearCookie("accessToken",options)
            .clearCookie("refreshToken",options)
            .json(new ApiResponse(200,{},"user logged out successfully"))
})

const refreshAccessToken = asyncHandler(async (req,res) => {
    const incommingRefreshToken = req.cookies.refreshToken||
req.body.refreshToken

if(!incommingRefreshToken){
    throw new ApiError(401,"refresh token is required")
}

try {
    
const decodedToken = await jwt.verify(
    incommingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET
)
const user = await User.findById(decodedToken?._id)
if (!user) {
      throw new ApiError(401,"Invalid refresh token")
}

if (incommingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401,"refresh token is expired")
}
const options = {
    httpOnly:true,
    secure: process.env.NODE_ENV === "production"
}

const {accessToken,refreshToken:newRefreshToken}  = 
await generateAccessAndRefreshToken(user._id)
return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refresh",newRefreshToken,options)
    .json(new ApiResponse(200,{accessToken,refreshToken:newRefreshToken},
        "Access token refreshed successfully"
    ))


} catch (error) {
    throw new 
    ApiError(500,
        "something went worng while generating Access And Refresh Token")
}
})
const changeCurrentPassword = asyncHandler(async (req,res) => {

    const {oldPassword,newPassword} = req.body
    const user = await User.findById(req.user?._id)
    const isPasswordvalid = await user.isPasswordCorrect(oldPassword)
    if(!isPasswordvalid){
        throw new ApiError(401,"Old password is incorrect")
    }
    user.password = newPassword
    await user.save({validateBeforeSave:false})
    return res.status(  200).json(new ApiResponse(200,"password changed successfully"))

})
const getCurrentUser = asyncHandler(async (req,res) => {
     return res.status(  200).json(new ApiResponse(200,req.user,"Current user details "))
})
const updateAccountDetails = asyncHandler(async (req,res) => {
    const {fullname,email} = req.body

    if(!fullname || !email){
        throw new ApiError(400,"Fullname and email are required  ")

    }

   const user  =  await User.findByIdAndUpdate(
        req.user?._id,{
            $set:{
                fullname,
                email:email
            }
        },{new:true}
    ).select("-password -refreshToken")

     return res.status(  200)
     .json(new ApiResponse(200,user,"account details changed successfully"))
})
const UpdateUserAvatar = asyncHandler(async (req,res) => {

    const avatarLocalPath = req.files?.path
    if (!avatarLocalPath) {
        throw new ApiError(400,"File is required")
    }

        const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(500,
            "something went worng while uploading avatar")
    }

   const user =  await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },{new:true}
    ).select("-password -refreshToken")


     return res.status(  200)
     .json(new ApiResponse(200,user ,"avatar changed successfully"))
})
const updateUserCoverImage = asyncHandler(async (req,res) => {

    const coverImageLocalPath = req.file?.path
    if (!coverImageLocalPath) {
        throw new ApiError(400,"File is required")
    }

const coverImage = await uploadOnCloudinary
(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(500,
            "something went worng while uploading avatar")
    }

   const user =  await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },{new:true}
    ).select("-password -refreshToken")


     return res.status(  200)
     .json(new ApiResponse(200,user ,"coverImage changed successfully"))
})
const getUserChannelProfile = asyncHandler(async(req, res) => {
    const {username} = req.params

    if (!username?.trim()) {
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1

            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "channel does not exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    )
})

const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
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
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])
if (!user) {
     throw new ApiError(404, "user does not exists ")
}
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})


export{
    registerUser,loginUser,refreshAccessToken,logoutUser,
    changeCurrentPassword,getCurrentUser
    ,updateAccountDetails,UpdateUserAvatar,updateUserCoverImage
    ,getWatchHistory,getUserChannelProfile
}