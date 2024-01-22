const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const couponSchema = new Schema({
  couponCode: {
    type: String,
    required: true,
    unique: true,
  },
  minTotalPrice: {
    type: Number,
    required: true,
  },
  discountPercentage: {
    type: Number,
    required: true,
  },
  available: {
    type: Boolean,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Coupon", couponSchema);
