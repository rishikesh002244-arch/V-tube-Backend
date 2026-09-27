# Video Controller Implementation Guide

This guide explains how to implement the `video.controller.js` for the VidTube project. It covers CRUD operations, file handling with Cloudinary, and advanced MongoDB queries using aggregation pipelines and pagination.

## Table of Contents
1. [Overview](#overview)
2. [Key Concepts](#key-concepts)
3. [Implementation Details](#implementation-details)
    - [Get All Videos](#get-all-videos)
    - [Publish a Video](#publish-a-video)
    - [Get Video by ID](#get-video-by-id)
    - [Update Video](#update-video)
    - [Delete Video](#delete-video)
    - [Toggle Publish Status](#toggle-publish-status)

---

## Overview

The Video Controller handles all requests related to videos. This includes fetching videos with filters and pagination, uploading new videos, updating details, and deleting videos.

## Key Concepts

To build this controller effectively, you need to understand:

1. **Aggregation Pipelines**: Used for complex queries (like joining tables or calculating fields).
2. **Pagination**: Fetching data in chunks (pages) rather than all at once. We use `mongoose-aggregate-paginate-v2`.
3. **Cloudinary**: For storing video and image files.
4. **Ownership Verification**: Ensuring only the owner can modify or delete their content.

---

## Implementation Details

### Get All Videos

**Goal**: Fetch videos based on search queries, user IDs, and support sorting and pagination.

**How to do it**:
1. **Extract Query Params**: Get `page`, `limit`, `query`, `sortBy`, `sortType`, and `userId` from `req.query`.
2. **Build Pipeline**:
    - Use `$match` to filter by `userId` or `query` (using `$regex` for search).
    - Use `$sort` to order results.
    - Use `$lookup` to join with the `users` collection to get the owner's avatar and username.
3. **Paginate**: Use `Video.aggregatePaginate` passing the pipeline and options (page, limit).

### Publish a Video

**Goal**: Upload video and thumbnail to Cloudinary and create a DB record.

**How to do it**:
1. **Validate**: Ensure `title` and `description` are present.
2. **File Extraction**: Get file paths from `req.files` (handled by Multer middleware).
3. **Upload**: Use `uploadOnCloudinary` for both files.
4. **Create**: Save the video document with URLs and `public_id`s from Cloudinary.

### Get Video by ID

**Goal**: Fetch a single video with owner details and increment views.

**How to do it**:
1. **Lookup**: Use an aggregation pipeline with `$match` and `$lookup` to get video + owner info.
2. **Increment**: Use `Video.findByIdAndUpdate` with `$inc: { views: 1 }` to count the view.

### Update Video

**Goal**: Update text fields and optionally replace the thumbnail.

**How to do it**:
1. **Auth Check**: Verify `video.owner` matches `req.user._id`.
2. **File Check**: If a new thumbnail is uploaded, upload it to Cloudinary and delete the old one using its `public_id`.
3. **Save**: Update the DB record.

### Delete Video

**Goal**: Remove video from DB and files from Cloudinary.

**How to do it**:
1. **Auth Check**: Verify ownership.
2. **Cloudinary Cleanup**: Use `deleteFromCloudinary` for both video and thumbnail `public_id`s.
3. **DB Cleanup**: Use `Video.findByIdAndDelete`.

### Toggle Publish Status

**Goal**: Flip the `isPublished` boolean.

**How to do it**:
1. **Auth Check**: Verify ownership.
2. **Toggle**: `video.isPublished = !video.isPublished`.
3. **Save**: `await video.save()`.

---

## Pro Tips for Next Time
- **Always Validate IDs**: Use `isValidObjectId` before querying the DB to avoid cast errors.
- **Cleanup on Failure**: If a DB operation fails after a file upload, remember to delete the file from Cloudinary (not implemented in all basic flows but good for production).
- **Secure Routes**: Ensure routes that modify data are protected by an authentication middleware (like `verifyJWT`).
