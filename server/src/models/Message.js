const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Conversation Schema
const conversationSchema = new Schema(
  {
    participants: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    }],
    
    // Optional references
    property: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
    },
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
    },

    // Conversation metadata
    type: {
      type: String,
      enum: ['inquiry', 'booking', 'support', 'general'],
      default: 'general',
    },

    // Last message info (for sorting)
    lastMessage: {
      content: String,
      sender: { type: Schema.Types.ObjectId, ref: 'User' },
      sentAt: Date,
    },

    // Unread counts per participant
    unreadCounts: [{
      user: { type: Schema.Types.ObjectId, ref: 'User' },
      count: { type: Number, default: 0 },
    }],

    // Status
    isArchived: {
      type: Boolean,
      default: false,
    },
    archivedBy: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
conversationSchema.index({ participants: 1 });
conversationSchema.index({ 'lastMessage.sentAt': -1 });
conversationSchema.index({ property: 1 });
conversationSchema.index({ booking: 1 });

// Static: Find or create conversation
conversationSchema.statics.findOrCreate = async function (participantIds, options = {}) {
  const sortedIds = participantIds.map(id => id.toString()).sort();

  let conversation = await this.findOne({
    participants: { $all: sortedIds, $size: sortedIds.length },
    ...(options.property && { property: options.property }),
    ...(options.booking && { booking: options.booking }),
  });

  if (!conversation) {
    conversation = await this.create({
      participants: sortedIds,
      type: options.type || 'general',
      property: options.property,
      booking: options.booking,
      unreadCounts: sortedIds.map(id => ({ user: id, count: 0 })),
    });
  }

  return conversation;
};

// Method: Get unread count for a user
conversationSchema.methods.getUnreadCount = function (userId) {
  const userCount = this.unreadCounts.find(
    uc => uc.user.toString() === userId.toString()
  );
  return userCount?.count || 0;
};

// Method: Increment unread count for all except sender
conversationSchema.methods.incrementUnread = async function (senderId) {
  this.unreadCounts.forEach(uc => {
    if (uc.user.toString() !== senderId.toString()) {
      uc.count += 1;
    }
  });
  await this.save();
};

// Method: Mark as read for a user
conversationSchema.methods.markAsRead = async function (userId) {
  const userCount = this.unreadCounts.find(
    uc => uc.user.toString() === userId.toString()
  );
  if (userCount) {
    userCount.count = 0;
    await this.save();
  }
};

const Conversation = mongoose.model('Conversation', conversationSchema);

// Message Schema
const messageSchema = new Schema(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Message must belong to a conversation'],
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Message must have a sender'],
    },

    // Content
    content: {
      type: String,
      required: [true, 'Message content is required'],
      maxlength: [5000, 'Message cannot exceed 5000 characters'],
    },

    // Message type
    type: {
      type: String,
      enum: ['text', 'image', 'file', 'system'],
      default: 'text',
    },

    // Attachments
    attachments: [{
      type: {
        type: String,
        enum: ['image', 'document', 'other'],
      },
      url: String,
      name: String,
      size: Number,
    }],

    // Read receipts
    readBy: [{
      user: { type: Schema.Types.ObjectId, ref: 'User' },
      readAt: { type: Date, default: Date.now },
    }],

    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });

// Virtual: Check if read by all participants
messageSchema.virtual('isRead').get(function () {
  // Needs conversation populated with participants
  return true; // Simplified
});

// Hook: Update conversation after message save
messageSchema.post('save', async function () {
  await Conversation.findByIdAndUpdate(this.conversation, {
    lastMessage: {
      content: this.content.substring(0, 100),
      sender: this.sender,
      sentAt: this.createdAt,
    },
  });
});

// Method: Mark as read by user
messageSchema.methods.markReadBy = async function (userId) {
  const alreadyRead = this.readBy.some(
    r => r.user.toString() === userId.toString()
  );

  if (!alreadyRead) {
    this.readBy.push({ user: userId, readAt: new Date() });
    await this.save();
  }
};

const Message = mongoose.model('Message', messageSchema);

module.exports = { Conversation, Message };
