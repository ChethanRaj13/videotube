import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { user as User } from "../models/user.models.js"; // Aliased to 'User' to avoid naming conflicts

export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        // 1. Fixed 'req.cookies' (plural) 
        // 2. Added a space after "Bearer " to perfectly isolate the token string
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
    
        if (!token) {
            throw new ApiError(401, "Unauthorized request");
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
        // Using the capitalized model variable 'User' here avoids variable shadowing
        const foundUser = await User.findById(decodedToken?._id).select("-password -refreshToken");
    
        if (!foundUser) {
            throw new ApiError(401, "Invalid Access Token");
        }
    
        req.user = foundUser;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token");
    }
});