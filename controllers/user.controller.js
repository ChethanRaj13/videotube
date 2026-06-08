    import {asyncHandler} from '../utils/asyncHandler.js';
    import { ApiError } from "../utils/ApiError.js";
    import { user } from "../models/user.models.js";
    import { uploadOnCloudinary } from "../utils/cloudinary.js";
    import { ApiResponse } from '../utils/ApiResponse.js';

    const generateAccessAndRefreshToken = async(userId) => {
        try{
            const user = await User.findById(userId);
            const accesToken = user.generateAccessToken()
            const refreshToken = user.generateRefreshToken()

            user.refreshToken = refreshToken
            await user.save({validateBeforeSave: false})

            return {accesToken, refreshToken}
        }
        catch(error) {
            throw new ApiError(500, "Something went wrong while generating refersh and access token")
        }   
    }


    const registerUser = asyncHandler(async (req, res) => {
        const {fullname, email, username, password} = req.body;
        
        if (
            [fullname,email,username,password].some((field) => 
            field?.trim() === "")
        ){
            throw new ApiError(400,"All fields are required!")
        }

        const existedUser = await user.findOne({
            $or: [{ username },{ email }]
        })

        if(existedUser){
            throw new ApiError(409,"user already exists!")
        }

        const avatarLocalPath = req.files?.avatar[0]?.path;
        // const coverImageLocalPath = req.files?.coverImage[0]?.path;

        let coverImageLocalPath;
        if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
            coverImageLocalPath = req.files.coverImage[0].path;
        }

        if (!avatarLocalPath){
            throw new ApiError(400,"Avatar are required!")
        }

        const avatar = await uploadOnCloudinary(avatarLocalPath)
        const coverImage = await uploadOnCloudinary(coverImageLocalPath)


        if(!avatar){
            throw new ApiError(400,"Avatar are required!")
        }

        const newUser = await user.create({
                fullname,
                avatar: avatar.url,
                coverImage: coverImage?.url || "",
                email,
                password,
                username: username.toLowerCase()
            })

        const createdUser = await user.findById(newUser._id).select(
            "-password -refreshToken"
        )

        if(!createdUser) {
            throw new ApiError(500, "something went wrong!")
        }

        return res.status(201).json(
            new ApiResponse(200,createdUser,"user registed successfully")
        )

    });

    const loginUser = asyncHandler(async (req,res) => {
        const {email,username,password} = req.body;

        if (!username || !email) {
            throw new ApiError(400, "username or email is required")
        }
        const user = await User.findOne({
            $or: [{username},{email}]
        })

        if(!user) {
            throw new ApiError(404,"User Don't exist")
        }

        const isPasswordValid = await user.isPasswordcorrect(password)
        
        if(!isPasswordValid) {
            throw new ApiError(404,"Invalid user password")
        }

        const {accesToken, refreshToken} = await generateAccessAndRefreshToken(user._id);

        const logedInUser = await User.findById(user._id).select("-password -refreshToken")

        const options = {
            httpOnly: true,
            secure: true
        }

        return res.
        status(200).
        cookie("accessToken",accesToken,options).
        cookie("refreshToken",refreshToken,options).
        json (
            new ApiResponse(
                200,{
                user: loggedInUser, accesToken,
                refreshToken
                },
                "User is logged in Sccessfully"
            )
        )

    });

    const logoutUser = asyncHandler(async (req, res) => {
        await User.findByIdAndUpdate(
            req.user._id,
            {
                $set: {
                    refreshToken: undefined
                }
            },
            {
                new: true
            }
        )

        const options = {
            httpOnly: true,
            secure: true
        }

        return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json (new ApiResponse(200, {}, "User logged Out"))
    })

    export {
        registerUser,
        loginUser,
        logoutUser
    }