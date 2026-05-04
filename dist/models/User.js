"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const userSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    role: {
        type: String,
        enum: ["Student", "Teacher", "Admin"],
        default: "Student",
    },
    phone: { type: String },
    subject: { type: String },
    stageId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Stage" },
    gradeId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Grade" }, // Student grade
    cvUrl: { type: String },
    bio: { type: String, default: "" },
    availableDays: [
        {
            type: String,
            enum: [
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
            ],
        },
    ],
    availableHours: {
        type: Map,
        of: new mongoose_1.Schema({ start: String, end: String }, { _id: false }),
        default: {},
    },
    subscribeLiveLessons: { type: Boolean, default: false },
    parentEmail: { type: String },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    profileImage: { type: String },
    isVerified: { type: Boolean, default: false },
    // Live lesson instant availability
    isAvailableForInstantLessons: { type: Boolean, default: false },
    instantLessonPricePerHour: { type: Number, default: 100, min: 0 },
    maxConcurrentSessions: { type: Number, default: 3, min: 1, max: 10 },
    onlineStatus: {
        type: String,
        enum: ["online", "offline", "busy", "away"],
        default: "offline",
    },
    lastSeen: { type: Date },
    otp: { type: String },
    otpExpires: { type: Date },
    otpLastSent: { type: Date },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    mustChangePassword: { type: Boolean, default: false },
}, {
    timestamps: true,
    toJSON: { flattenMaps: true },
    toObject: { flattenMaps: true },
});
userSchema.methods.matchPassword = async function (enteredPassword) {
    if (!this.password)
        return false;
    return await bcryptjs_1.default.compare(enteredPassword, this.password);
};
userSchema.pre("save", async function () {
    if (!this.isModified("password") || !this.password) {
        return;
    }
    const salt = await bcryptjs_1.default.genSalt(10);
    this.password = await bcryptjs_1.default.hash(this.password, salt);
});
const User = mongoose_1.default.model("User", userSchema);
exports.default = User;
