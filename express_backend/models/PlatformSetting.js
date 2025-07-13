// File: express_backend/models/PlatformSetting.js
import mongoose from 'mongoose';

const platformSettingSchema = new mongoose.Schema({
  key:   { type: String, required: true, unique: true },
  value: mongoose.Schema.Types.Mixed,    // could be string, number, object…
}, { timestamps: true });

export default mongoose.model('PlatformSetting', platformSettingSchema);

