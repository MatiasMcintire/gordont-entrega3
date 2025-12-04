import mongoose from 'mongoose';

// Exercise sub-schema
const exerciseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Exercise name is required'],
      trim: true,
      minlength: [1, 'Exercise name cannot be empty'],
      maxlength: [100, 'Exercise name cannot exceed 100 characters'],
    },
    sets: {
      type: Number,
      required: [true, 'Sets is required'],
      min: [1, 'Sets must be at least 1'],
      max: [100, 'Sets cannot exceed 100'],
    },
    reps: {
      type: Number,
      required: [true, 'Reps is required'],
      min: [1, 'Reps must be at least 1'],
      max: [1000, 'Reps cannot exceed 1000'],
    },
    weight: {
      type: Number,
      default: 0,
      min: [0, 'Weight cannot be negative'],
      max: [1000, 'Weight cannot exceed 1000 kg'],
    },
    duration: {
      type: Number,
      default: 0,
      min: [0, 'Duration cannot be negative'],
      max: [86400, 'Duration cannot exceed 24 hours'],
    },
    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: [200, 'Exercise notes cannot exceed 200 characters'],
    },
  },
  { _id: false }
);

// Main workout schema
const workoutSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true,
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    index: true,
  },
  type: {
    type: String,
    enum: {
      values: ['strength', 'cardio', 'flexibility', 'sports', 'other'],
      message: 'Type must be one of: strength, cardio, flexibility, sports, other',
    },
    required: [true, 'Workout type is required'],
  },
  exercises: {
    type: [exerciseSchema],
    validate: {
      validator(v) {
        return v && v.length > 0;
      },
      message: 'At least one exercise is required',
    },
    required: [true, 'Exercises array is required'],
  },
  duration: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [1, 'Duration must be at least 1 second'],
    max: [86400, 'Duration cannot exceed 24 hours'],
  },
  caloriesBurned: {
    type: Number,
    default: 0,
    min: [0, 'Calories burned cannot be negative'],
    max: [10000, 'Calories burned seems unrealistic'],
  },
  notes: {
    type: String,
    default: '',
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
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

// Pre-save middleware
workoutSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Pre-update middleware
workoutSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: Date.now() });
  next();
});

export const Workout = mongoose.model('Workout', workoutSchema);
