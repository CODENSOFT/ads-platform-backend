import mongoose from 'mongoose';

const fieldSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'Field key is required'],
      trim: true,
    },
    label: {
      type: String,
      required: [true, 'Field label is required'],
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Field type is required'],
      enum: ['text', 'number', 'select', 'boolean'],
    },
    required: {
      type: Boolean,
      default: false,
    },
    options: {
      type: [String],
      default: undefined,
      // Only used when type === 'select'
    },
    min: { type: Number, default: undefined },
    max: { type: Number, default: undefined },
    placeholder: { type: String, default: undefined, trim: true },
    unit: { type: String, default: undefined, trim: true },
  },
  { _id: false }
);

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Category slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    fields: {
      type: [fieldSchema],
      required: [true, 'Category fields are required'],
      default: [],
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

// slug is already indexed via unique: true

const Category = mongoose.model('Category', categorySchema);

export default Category;
