    import {asyncHandler} from '../utils/asyncHandler.js';
    import { ApiError } from "../utils/ApiError.js";
    import { user } from "../models/user.models.js";
    import { uploadOnCloudinary } from "../utils/cloudinary.js";
    import { ApiResponse } from '../utils/ApiResponse.js';

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

    export {registerUser}