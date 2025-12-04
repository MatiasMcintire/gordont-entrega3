import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email'],
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: 2,
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false,
  },
  // Nuevos campos de fitness
  weight: {
    type: Number,
    required: [true, 'Weight is required'],
    min: [1, 'Weight must be at least 1 kg'],
    max: [500, 'Weight cannot exceed 500 kg'],
  },
  height: {
    type: Number,
    required: [true, 'Height is required'],
    min: [50, 'Height must be at least 50 cm'],
    max: [300, 'Height cannot exceed 300 cm'],
  },
  age: {
    type: Number,
    required: [true, 'Age is required'],
    min: [13, 'Must be at least 13 years old'],
    max: [120, 'Age cannot exceed 120 years'],
  },
  role: {
    type: String,
    enum: ['usuario', 'admin'],
    default: 'usuario',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Pre-save middleware para actualizar updatedAt
userSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Pre-update middleware
userSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: Date.now() });
  next();
});

export const User = mongoose.model('User', userSchema);
