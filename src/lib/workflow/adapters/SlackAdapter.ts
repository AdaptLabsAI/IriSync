/**
 * Slack adapter for workflow automation
 */
export interface SlackMessage {
  channel: string;
  text: string;
  attachments?: any[];
  blocks?: any[];
  thread_ts?: string;
}

export interface SlackConfig {
  botToken: string;
  signingSecret: string;
  appToken?: string;
}

export class SlackAdapter {
  private config: SlackConfig;
  private baseUrl = 'https://slack.com/api';

  constructor(config: SlackConfig) {
    this.config = config;
  }

  /**
   * Send a message to a Slack channel
   */
  async sendMessage(message: SlackMessage): Promise<{ success: boolean; ts?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/chat.postMessage`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const data = await response.json();

      if (data.ok) {
        return { success: true, ts: data.ts };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Update a message in Slack
   */
  async updateMessage(channel: string, ts: string, text: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/chat.update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel,
          ts,
          text,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get channel information
   */
  async getChannelInfo(channel: string): Promise<{ success: boolean; channel?: any; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/conversations.info?channel=${channel}`, {
        headers: {
          'Authorization': `Bearer ${this.config.botToken}`,
        },
      });

      const data = await response.json();

      if (data.ok) {
        return { success: true, channel: data.channel };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * List channels the bot has access to
   */
  async listChannels(): Promise<{ success: boolean; channels?: any[]; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/conversations.list`, {
        headers: {
          'Authorization': `Bearer ${this.config.botToken}`,
        },
      });

      const data = await response.json();

      if (data.ok) {
        return { success: true, channels: data.channels };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

export default SlackAdapter; 