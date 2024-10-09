const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const QuestionSchema = new Schema({
  name: { type: String, required: true },
  frName: { type: String },
  description: { type: String },
  frDescription: { type: String },
  clauses: [{ type: Schema.Types.ObjectId, ref: 'Clause' }],
  order: { type: Number },
  onlyIf: { type: Boolean },
  isUber: { type: Boolean },
  isUnique: { type: Boolean }
});

QuestionSchema.virtual('url').get(function () {
  return '/edit/question/' + this._id;
});

module.exports = mongoose.model('Question', QuestionSchema);