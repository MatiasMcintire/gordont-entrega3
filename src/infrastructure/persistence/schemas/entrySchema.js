import mongoose from 'mongoose';

const foodItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Food name is required'],
      trim: true,
    },
    calories: {
      type: Number,
      required: [true, 'Calories is required'],
      min: [0, 'Calories cannot be negative'],
    },
    protein: {
      type: Number,
      required: [true, 'Protein is required'],
      min: [0, 'Protein cannot be negative'],
    },
    carbs: {
      type: Number,
      required: [true, 'Carbs is required'],
      min: [0, 'Carbs cannot be negative'],
    },
    fat: {
      type: Number,
      required: [true, 'Fat is required'],
      min: [0, 'Fat cannot be negative'],
    },
    quantity: {
      type: Number,
      default: 100,
      min: [0.1, 'Quantity must be greater than 0'],
    },
  },
  { _id: false }
);

const entrySchema = new mongoose.Schema({
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
  mealType: {
    type: String,
    enum: {
      values: ['breakfast', 'lunch', 'dinner', 'snack'],
      message: 'Meal type must be breakfast, lunch, dinner or snack',
    },
    required: [true, 'Meal type is required'],
  },
  foods: {
    type: [foodItemSchema],
    required: [true, 'Foods array is required'],
    validate: {
      validator(v) {
        return v.length > 0;
      },
      message: 'At least one food item is required',
    },
  },
  notes: {
    type: String,
    default: '',
    trim: true,
  },
  totalCalories: {
    type: Number,
    default: 0,
  },
  totalProtein: {
    type: Number,
    default: 0,
  },
  totalCarbs: {
    type: Number,
    default: 0,
  },
  totalFat: {
    type: Number,
    default: 0,
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

// Pre-save middleware para calcular totales
entrySchema.pre('save', function (next) {
  this.totalCalories = this.foods.reduce((sum, food) => sum + food.calories, 0);
  this.totalProtein = this.foods.reduce((sum, food) => sum + food.protein, 0);
  this.totalCarbs = this.foods.reduce((sum, food) => sum + food.carbs, 0);
  this.totalFat = this.foods.reduce((sum, food) => sum + food.fat, 0);
  this.updatedAt = Date.now();
  next();
});

// Pre-update middleware
entrySchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: Date.now() });
  next();
});

export const Entry = mongoose.model('Entry', entrySchema);
