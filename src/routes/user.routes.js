import { Router } from "express";
import { registerUser,logoutUser, loginUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, getUserChannelProfile, updateAccountDetails, UpdateUserAvatar, updateUserCoverImage, getWatchHistory } from 
"../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import {verifyJwt} from "../middlewares/auth.middleware.js"

const router = Router()

// unsecured routes 
router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
                maxCount:1
        },{
            name:"coverImage",
            maxCount:1
        }

    ]),
    
    registerUser)
    router.route("/login").post(loginUser)
    router.route("/refresh-token").post(refreshAccessToken)

// secured routes 
router.route("/logout").post(verifyJwt,logoutUser)
router.route("/change-password")
.post(verifyJwt,changeCurrentPassword)

router.route("/current-user").get(verifyJwt,getCurrentUser)
router.route("/c/:username").get(verifyJwt,getUserChannelProfile)
router.route("/update-account").patch(verifyJwt,updateAccountDetails)
router.route("/avatar").patch(verifyJwt,upload.single("avatar"),UpdateUserAvatar)
router.route("/cover-image")
.patch(verifyJwt,upload.single("coverImage"),updateUserCoverImage)
router.route("/history").get(verifyJwt,getWatchHistory)



export default router