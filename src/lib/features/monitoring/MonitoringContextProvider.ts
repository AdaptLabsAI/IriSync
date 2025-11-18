/**
 * Monitoring Context Provider for AI Chat
 *
 * Provides social listening and engagement data as context for AI chat.
 * This allows the AI to access monitoring insights, mentions, sentiment analysis,
 * and engagement metrics when responding to user queries.
 */

import { socialListeningService } from './SocialListeningService';
import { engagementService } from './EngagementService';
import { sentimentAnalysisService } from './SentimentAnalysisService';

export interface MonitoringContext {
  type: 'monitoring';
  content: string;
  metadata: {
    source: 'social_listening' | 'engagement' | 'sentiment' | 'stats';
    timestamp: string;
  };
}

/**
 * Build monitoring context for AI chat
 */
export async function buildMonitoringContext(
  userId: string,
  organizationId: string,
  options: {
    includeMentions?: boolean;
    includeEngagement?: boolean;
    includeStats?: boolean;
    includeBrandHealth?: boolean;
    includeCompetitors?: boolean;
    days?: number;
    maxItems?: number;
  } = {}
): Promise<MonitoringContext[]> {
  const contexts: MonitoringContext[] = [];
  const days = options.days || 7;
  const maxItems = options.maxItems || 10;

  try {
    // Include recent mentions
    if (options.includeMentions !== false) {
      const mentions = await socialListeningService.getMentions(userId, organizationId, {
        limit: maxItems,
        isRead: false, // Focus on unread mentions
      });

      if (mentions.length > 0) {
        const mentionsText = mentions
          .slice(0, 5) // Limit to top 5 for context
          .map((m, i) => {
            return `${i + 1}. [${m.source.platformType}] @${m.source.authorUsername}: "${m.content}"
   - Sentiment: ${m.sentiment || 'unknown'} (score: ${m.sentimentScore?.toFixed(2) || 'N/A'})
   - Priority: ${m.priority || 'medium'}
   - Keywords: ${m.keywords.join(', ')}
   - Hashtags: ${m.hashtags.join(', ')}`;
          })
          .join('\n\n');

        contexts.push({
          type: 'monitoring',
          content: `Recent Social Media Mentions (${mentions.length} total, showing top 5):\n\n${mentionsText}`,
          metadata: {
            source: 'social_listening',
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    // Include engagement items
    if (options.includeEngagement !== false) {
      const items = await engagementService.getEngagementItems(userId, organizationId, {
        limit: maxItems,
        requiresResponse: true, // Focus on items needing response
      });

      if (items.length > 0) {
        const engagementText = items
          .slice(0, 5)
          .map((item, i) => {
            return `${i + 1}. [${item.platformType}] ${item.type} from @${item.authorUsername}: "${item.content}"
   - Sentiment: ${item.sentiment || 'unknown'}
   - Priority: ${item.priority || 'medium'}
   - Requires Response: ${item.requiresResponse ? 'Yes' : 'No'}
   - Has Replied: ${item.hasReplied ? 'Yes' : 'No'}`;
          })
          .join('\n\n');

        contexts.push({
          type: 'monitoring',
          content: `Engagement Items Requiring Response (${items.length} total, showing top 5):\n\n${engagementText}`,
          metadata: {
            source: 'engagement',
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    // Include statistics
    if (options.includeStats !== false) {
      const listeningStats = await socialListeningService.getListeningStats(
        userId,
        organizationId,
        days
      );

      const engagementStats = await engagementService.getEngagementStats(
        userId,
        organizationId,
        days
      );

      const statsText = `Social Listening & Engagement Statistics (Last ${days} days):

📊 Mentions:
- Total: ${listeningStats.totalMentions}
- Unread: ${listeningStats.unreadMentions}
- Sentiment: ${listeningStats.sentimentBreakdown.positive} positive, ${listeningStats.sentimentBreakdown.neutral} neutral, ${listeningStats.sentimentBreakdown.negative} negative

💬 Engagement:
- Total Items: ${engagementStats.totalItems}
- Unread: ${engagementStats.unreadCount}
- Requires Response: ${engagementStats.requiresResponseCount}
- Average Response Time: ${engagementStats.averageResponseTime.toFixed(1)} hours
- Response Rate: ${engagementStats.responseRate.toFixed(1)}%

🔝 Top Hashtags:
${listeningStats.topHashtags.slice(0, 5).map((h, i) => `${i + 1}. ${h.hashtag} (${h.count} mentions, avg sentiment: ${h.avgSentiment.toFixed(2)})`).join('\n')}

🔑 Top Keywords:
${listeningStats.topKeywords.slice(0, 5).map((k, i) => `${i + 1}. ${k.keyword} (${k.count} mentions)`).join('\n')}`;

      contexts.push({
        type: 'monitoring',
        content: statsText,
        metadata: {
          source: 'stats',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Include brand health analysis
    if (options.includeBrandHealth !== false) {
      const mentions = await socialListeningService.getMentions(userId, organizationId, {
        limit: 1000,
      });

      const sentiments = mentions
        .filter(m => m.sentiment && m.sentimentScore !== undefined)
        .map(m => ({
          sentiment: m.sentiment!,
          score: m.sentimentScore!,
          confidence: 0.8,
          emotions: { joy: 0, anger: 0, sadness: 0, fear: 0, surprise: 0 },
          intent: 'other' as const,
          keywords: m.keywords,
          requiresResponse: false,
          priority: m.priority,
        }));

      if (sentiments.length > 0) {
        const brandHealth = sentimentAnalysisService.calculateBrandHealth(sentiments, 'week');

        const healthText = `Brand Health Analysis:

Score: ${brandHealth.score.toFixed(1)}/100
Trend: ${brandHealth.trend === 'improving' ? '📈 Improving' : brandHealth.trend === 'declining' ? '📉 Declining' : '➡️ Stable'}

Sentiment Breakdown:
- Positive: ${brandHealth.breakdown.positive} (${((brandHealth.breakdown.positive / (brandHealth.breakdown.positive + brandHealth.breakdown.neutral + brandHealth.breakdown.negative)) * 100).toFixed(1)}%)
- Neutral: ${brandHealth.breakdown.neutral} (${((brandHealth.breakdown.neutral / (brandHealth.breakdown.positive + brandHealth.breakdown.neutral + brandHealth.breakdown.negative)) * 100).toFixed(1)}%)
- Negative: ${brandHealth.breakdown.negative} (${((brandHealth.breakdown.negative / (brandHealth.breakdown.positive + brandHealth.breakdown.neutral + brandHealth.breakdown.negative)) * 100).toFixed(1)}%)

Average Sentiment: ${brandHealth.averageSentiment.toFixed(2)}

Recommendations:
${brandHealth.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}`;

        contexts.push({
          type: 'monitoring',
          content: healthText,
          metadata: {
            source: 'sentiment',
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    // Include competitor analysis
    if (options.includeCompetitors === true) {
      const config = await socialListeningService.getMonitoringConfig(userId, organizationId);

      if (config && config.competitorKeywords.length > 0) {
        const mentions = await socialListeningService.getMentions(userId, organizationId, {
          limit: 1000,
        });

        const competitorMentions = mentions.filter(m =>
          m.keywords.some(k => config.competitorKeywords.includes(k))
        );

        if (competitorMentions.length > 0) {
          const competitorSentiments = competitorMentions
            .filter(m => m.sentiment && m.sentimentScore !== undefined)
            .map(m => ({
              sentiment: m.sentiment!,
              score: m.sentimentScore!,
              confidence: 0.8,
              emotions: { joy: 0, anger: 0, sadness: 0, fear: 0, surprise: 0 },
              intent: 'other' as const,
              keywords: m.keywords,
              requiresResponse: false,
              priority: m.priority,
            }));

          const competitorHealth = sentimentAnalysisService.calculateBrandHealth(
            competitorSentiments,
            'week'
          );

          const competitorText = `Competitor Analysis:

Tracked Competitors: ${config.competitorKeywords.join(', ')}

Total Competitor Mentions: ${competitorMentions.length}
Competitor Sentiment Score: ${competitorHealth.score.toFixed(1)}/100
Trend: ${competitorHealth.trend === 'improving' ? '📈 Improving' : competitorHealth.trend === 'declining' ? '📉 Declining' : '➡️ Stable'}

Top Competitor Keywords:
${config.competitorKeywords
  .map(keyword => {
    const keywordMentions = competitorMentions.filter(m => m.keywords.includes(keyword));
    const avgSentiment = keywordMentions
      .filter(m => m.sentimentScore !== undefined)
      .reduce((sum, m) => sum + (m.sentimentScore || 0), 0) / Math.max(1, keywordMentions.length);
    return `- ${keyword}: ${keywordMentions.length} mentions (avg sentiment: ${avgSentiment.toFixed(2)})`;
  })
  .join('\n')}`;

          contexts.push({
            type: 'monitoring',
            content: competitorText,
            metadata: {
              source: 'social_listening',
              timestamp: new Date().toISOString(),
            },
          });
        }
      }
    }

  } catch (error) {
    console.error('Error building monitoring context:', error);
  }

  return contexts;
}

/**
 * Format monitoring context for AI chat
 */
export function formatMonitoringContextForAI(contexts: MonitoringContext[]): string {
  if (contexts.length === 0) {
    return '';
  }

  const formatted = contexts.map(ctx => ctx.content).join('\n\n---\n\n');

  return `# Social Media Monitoring Context

The following data provides insights into the user's social media presence, mentions, engagement, and brand health. Use this information to provide informed recommendations and responses.

${formatted}

---

Based on this monitoring data, provide context-aware recommendations and insights when responding to user queries about their social media performance, engagement, or brand reputation.`;
}
