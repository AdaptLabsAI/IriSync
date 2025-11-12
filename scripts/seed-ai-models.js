/**
 * Seed AI Model Configurations Script
 * This script populates the aiModelConfigurations collection with default model assignments
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');
  try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error) {
    console.error('Error loading service account key. Using default credentials.');
    admin.initializeApp();
  }
}

const firestore = admin.firestore();

// Define the default model configurations
const defaultModelConfigurations = [
  // CREATOR TIER
  { tier: 'creator', taskType: 'long_form_content', model: 'gpt-3.5-turbo' },
  { tier: 'creator', taskType: 'social_media_post', model: 'gemini-2-0-flash' },
  { tier: 'creator', taskType: 'caption_writing', model: 'gemini-2-0-flash' },
  { tier: 'creator', taskType: 'hashtag_generation', model: 'gemini-2-0-flash' },
  { tier: 'creator', taskType: 'image_analysis', model: 'gemini-2-0-flash' },
  { tier: 'creator', taskType: 'alt_text_generation', model: 'gemini-2-0-flash' },
  { tier: 'creator', taskType: 'visual_content_moderation', model: 'gemini-2-0-flash' },
  { tier: 'creator', taskType: 'sentiment_analysis', model: 'gemini-2-0-flash' },
  { tier: 'creator', taskType: 'content_categorization', model: 'gemini-2-0-flash' },
  { tier: 'creator', taskType: 'comment_replies', model: 'gemini-2-0-flash' },
  { tier: 'creator', taskType: 'customer_support', model: 'gpt-3.5-turbo' },
  { tier: 'creator', taskType: 'chatbot', model: 'gpt-3.5-turbo' },
  { tier: 'creator', taskType: 'retrieval', model: 'gpt-3.5-turbo' },
  { tier: 'creator', taskType: 'semantic_search', model: 'gemini-2-0-flash' },
  { tier: 'creator', taskType: 'workflow_automation', model: 'gpt-3.5-turbo' },

  // INFLUENCER TIER
  { tier: 'influencer', taskType: 'long_form_content', model: 'claude-3-5-sonnet' },
  { tier: 'influencer', taskType: 'social_media_post', model: 'gpt-3.5-turbo' },
  { tier: 'influencer', taskType: 'caption_writing', model: 'gpt-3.5-turbo' },
  { tier: 'influencer', taskType: 'hashtag_generation', model: 'gemini-2-0-flash' },
  { tier: 'influencer', taskType: 'image_analysis', model: 'gemini-2-5-pro' },
  { tier: 'influencer', taskType: 'alt_text_generation', model: 'gemini-2-5-pro' },
  { tier: 'influencer', taskType: 'visual_content_moderation', model: 'gemini-2-5-pro' },
  { tier: 'influencer', taskType: 'sentiment_analysis', model: 'gpt-3.5-turbo' },
  { tier: 'influencer', taskType: 'content_categorization', model: 'gpt-3.5-turbo' },
  { tier: 'influencer', taskType: 'engagement_prediction', model: 'gpt-3.5-turbo' },
  { tier: 'influencer', taskType: 'content_strategy', model: 'claude-3-5-sonnet' },
  { tier: 'influencer', taskType: 'competitive_analysis', model: 'claude-3-5-sonnet' },
  { tier: 'influencer', taskType: 'trend_analysis', model: 'gemini-2-5-pro' },
  { tier: 'influencer', taskType: 'performance_insights', model: 'gemini-2-5-pro' },
  { tier: 'influencer', taskType: 'comment_replies', model: 'gpt-3.5-turbo' },
  { tier: 'influencer', taskType: 'customer_support', model: 'claude-3-5-sonnet' },
  { tier: 'influencer', taskType: 'social_listening', model: 'gemini-2-5-pro' },
  { tier: 'influencer', taskType: 'chatbot', model: 'claude-3-5-sonnet' },
  { tier: 'influencer', taskType: 'retrieval', model: 'claude-3-5-sonnet' },
  { tier: 'influencer', taskType: 'semantic_search', model: 'gpt-3.5-turbo' },
  { tier: 'influencer', taskType: 'workflow_automation', model: 'claude-3-5-sonnet' },

  // ENTERPRISE TIER
  { tier: 'enterprise', taskType: 'long_form_content', model: 'claude-3-7-sonnet' },
  { tier: 'enterprise', taskType: 'social_media_post', model: 'claude-3-5-sonnet' },
  { tier: 'enterprise', taskType: 'caption_writing', model: 'claude-3-5-sonnet' },
  { tier: 'enterprise', taskType: 'hashtag_generation', model: 'claude-3-5-sonnet' },
  { tier: 'enterprise', taskType: 'image_analysis', model: 'gemini-2-5-pro' },
  { tier: 'enterprise', taskType: 'alt_text_generation', model: 'gemini-2-5-pro' },
  { tier: 'enterprise', taskType: 'visual_content_moderation', model: 'gemini-2-5-pro' },
  { tier: 'enterprise', taskType: 'sentiment_analysis', model: 'claude-3-5-sonnet' },
  { tier: 'enterprise', taskType: 'content_categorization', model: 'claude-3-5-sonnet' },
  { tier: 'enterprise', taskType: 'engagement_prediction', model: 'claude-3-5-sonnet' },
  { tier: 'enterprise', taskType: 'content_strategy', model: 'claude-3-7-sonnet' },
  { tier: 'enterprise', taskType: 'competitive_analysis', model: 'claude-3-7-sonnet' },
  { tier: 'enterprise', taskType: 'trend_analysis', model: 'claude-3-7-sonnet' },
  { tier: 'enterprise', taskType: 'performance_insights', model: 'claude-3-7-sonnet' },
  { tier: 'enterprise', taskType: 'comment_replies', model: 'claude-3-5-sonnet' },
  { tier: 'enterprise', taskType: 'customer_support', model: 'claude-3-7-sonnet' },
  { tier: 'enterprise', taskType: 'social_listening', model: 'claude-3-7-sonnet' },
  { tier: 'enterprise', taskType: 'chatbot', model: 'claude-3-7-sonnet' },
  { tier: 'enterprise', taskType: 'brand_voice_analysis', model: 'claude-3-7-sonnet' },
  { tier: 'enterprise', taskType: 'smart_replies', model: 'claude-3-5-sonnet' },
  { tier: 'enterprise', taskType: 'advanced_social_listening', model: 'claude-3-7-sonnet' },
  { tier: 'enterprise', taskType: 'retrieval', model: 'claude-3-7-sonnet' },
  { tier: 'enterprise', taskType: 'semantic_search', model: 'claude-3-5-sonnet' },
  { tier: 'enterprise', taskType: 'workflow_automation', model: 'claude-3-7-sonnet' },

  // ANONYMOUS TIER (limited access)
  { tier: 'anonymous', taskType: 'chatbot', model: 'gemini-2-0-flash' }
];

async function seedAIModelConfigurations() {
  console.log('🚀 Starting AI Model Configurations seeding...');

  const batch = firestore.batch();
  let count = 0;

  for (const config of defaultModelConfigurations) {
    const docId = `${config.tier}_${config.taskType}`;
    const docRef = firestore.collection('aiModelConfigurations').doc(docId);

    // Check if configuration already exists
    const existingDoc = await docRef.get();
    if (existingDoc.exists) {
      console.log(`⏭️  Skipping existing configuration: ${docId}`);
      continue;
    }

    // Set default parameters based on tier
    let parameters = {
      temperature: 0.7,
      maxTokens: 1000,
      qualityPreference: 'standard'
    };

    switch (config.tier) {
      case 'enterprise':
        parameters = {
          temperature: 0.75,
          maxTokens: 1250,
          qualityPreference: 'highest'
        };
        break;
      case 'influencer':
        parameters = {
          temperature: 0.7,
          maxTokens: 1100,
          qualityPreference: 'high'
        };
        break;
      case 'creator':
        parameters = {
          temperature: 0.7,
          maxTokens: 1000,
          qualityPreference: 'standard'
        };
        break;
      case 'anonymous':
        parameters = {
          temperature: 0.3,
          maxTokens: 150,
          qualityPreference: 'standard'
        };
        break;
    }

    const configData = {
      tier: config.tier,
      taskType: config.taskType,
      model: config.model,
      parameters,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'system_seed',
      updatedBy: 'system_seed'
    };

    batch.set(docRef, configData);
    count++;

    console.log(`✅ Added configuration: ${config.tier} -> ${config.taskType} -> ${config.model}`);

    // Commit in batches of 500 (Firestore limit)
    if (count % 500 === 0) {
      await batch.commit();
      console.log(`📦 Committed batch of ${count} configurations`);
    }
  }

  // Commit any remaining documents
  if (count % 500 !== 0) {
    await batch.commit();
  }

  console.log(`🎉 Successfully seeded ${count} AI model configurations!`);
  console.log('');
  console.log('📋 Summary:');
  console.log(`   • Creator tier: ${defaultModelConfigurations.filter(c => c.tier === 'creator').length} configurations`);
  console.log(`   • Influencer tier: ${defaultModelConfigurations.filter(c => c.tier === 'influencer').length} configurations`);
  console.log(`   • Enterprise tier: ${defaultModelConfigurations.filter(c => c.tier === 'enterprise').length} configurations`);
  console.log(`   • Anonymous tier: ${defaultModelConfigurations.filter(c => c.tier === 'anonymous').length} configurations`);
  console.log('');
  console.log('🔧 Next steps:');
  console.log('   1. Visit /admin/ai-models to manage configurations');
  console.log('   2. Update models as needed for optimal performance');
  console.log('   3. Monitor AI usage and costs through the admin dashboard');
}

async function main() {
  try {
    await seedAIModelConfigurations();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding AI model configurations:', error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { seedAIModelConfigurations }; 