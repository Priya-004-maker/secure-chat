import { Schema, Types, model, type InferSchemaType } from "mongoose";

const NINETY_DAYS_IN_SECONDS = 60 * 60 * 24 * 90;

export const MEDIA_TYPES = ["image", "video", "audio"] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

const mediaSchema = new Schema(
  {
    type: { type: String, enum: MEDIA_TYPES, required: true },
    key: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, default: 0 },
    width: { type: Number },
    height: { type: Number },
    durationMs: { type: Number },
    thumbnailKey: { type: String },
  },
  { _id: false, versionKey: false },
);

const messageSchema = new Schema(
  {
    sender: { type: Types.ObjectId, ref: "User", required: true, index: true },
    recipient: { type: Types.ObjectId, ref: "User", required: true, index: true },
    content: { type: String, default: "", trim: true, maxlength: 4000 },
    media: { type: mediaSchema, default: null },
    replyTo: { type: Types.ObjectId, ref: "Message", default: null, index: true },
    sentAt: { type: Date, default: Date.now, expires: NINETY_DAYS_IN_SECONDS },
    seenAt: { type: Date, default: null },
  },
  { versionKey: false },
);

messageSchema.index({ sender: 1, recipient: 1, sentAt: -1 });

export type Message = InferSchemaType<typeof messageSchema>;
export const MessageModel = model("Message", messageSchema);
