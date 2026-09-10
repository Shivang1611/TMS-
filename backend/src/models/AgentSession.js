const mongoose = require('mongoose');

/**
 * AgentSession — stores conversation history and any pending confirmation
 * for a user's ongoing chat session with the AI agent.
 */
const agentSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // Conversation history in Llama-compatible format
    history: [
      {
        role: {
          type: String,
          enum: ['user', 'assistant', 'tool'],
          required: true,
        },
        content: {
          type: String,
        },
        tool_calls: {
          type: mongoose.Schema.Types.Mixed,
        },
        tool_call_id: {
          type: String,
        },
        name: {
          type: String,
        },
      },
    ],
    // Holds a pending write action awaiting user confirmation
    pendingConfirm: {
      toolName: String,
      args: mongoose.Schema.Types.Mixed,
      summary: String,        // human-readable summary for the confirm card
      requiresTypeConfirm: Boolean,  // true for delete* tools
      confirmTarget: String,  // the name/title the user must type to confirm
      originalMessage: String,
      auditLogId: mongoose.Schema.Types.ObjectId, // pre-written audit row ID
      context: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Sessions expire after 24 hours of inactivity
agentSessionSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('AgentSession', agentSessionSchema);
