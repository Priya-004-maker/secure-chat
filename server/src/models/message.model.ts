import { Schema, Types, model, type InferSchemaType } from "mongoose";

const NINETY_DAYS_IN_SECONDS = 60 * 60 * 24 * 90;

const messageSchema = new Schema(
  {
    sender: { type: Types.ObjectId, ref: "User", required: true, index: true },
    recipient: { type: Types.ObjectId, ref: "User", required: true, index: true },
    content: { type: String, required: true, trim: true, maxlength: 4000 },
    sentAt: { type: Date, default: Date.now, expires: NINETY_DAYS_IN_SECONDS },
    seenAt: { type: Date, default: null },
  },
  { versionKey: false },
);

messageSchema.index({ sender: 1, recipient: 1, sentAt: -1 });

export type Message = InferSchemaType<typeof messageSchema>;
export const MessageModel = model("Message", messageSchema);
