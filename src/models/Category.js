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
      enum: ['text', 'textarea', 'number', 'select', 'multiselect', 'boolean', 'date'],
    },
    required: {
      type: Boolean,
      default: false,
    },
    options: {
      type: [String],
      default: undefined,
    },
    min: { type: Number, default: undefined },
    max: { type: Number, default: undefined },
    placeholder: { type: String, default: undefined, trim: true },
    unit: { type: String, default: undefined, trim: true },
    group: { type: String, default: undefined, trim: true },
    order: { type: Number, default: undefined },
    filterable: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const subcategorySchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    fields: {
      type: [fieldSchema],
      default: undefined,
    },
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
      trim: true,
      lowercase: true,
      index: true,
    },
    fields: {
      type: [fieldSchema],
      required: [true, 'Category fields are required'],
      default: [],
    },
    subcategories: {
      type: [subcategorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

const Category = mongoose.model('Category', categorySchema);

export default Category;
