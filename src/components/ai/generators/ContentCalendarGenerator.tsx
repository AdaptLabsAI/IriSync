import React, { useState } from 'react';
import { useAIToolkit } from '../../../hooks/useAIToolkit';
import { SocialPlatform } from '../../../lib/models/SocialAccount';
import { AITaskType } from '../../../lib/ai/models';
import AITokenAlert from '../toolkit/AITokenAlert';
import { useSubscription } from '../../../hooks/useSubscription';
import { useToast } from '../../ui/use-toast';

interface ContentScheduleItem {
  day: string;
  time: string;
  platform: SocialPlatform;
  contentType: string;
  topic?: string;
  notes?: string;
}

interface ContentCalendarGeneratorProps {
  onCalendarGenerated: (schedule: ContentScheduleItem[]) => void;
  initialTopics?: string[];
}

/**
 * Enterprise-tier calendar generation tool that creates optimized content schedules
 * Based on analytics data and industry best practices
 */
export default function ContentCalendarGenerator({ 
  onCalendarGenerated,
  initialTopics = []
}: ContentCalendarGeneratorProps) {
  const { suggestPostingTime, generateContent, loading, error } = useAIToolkit();
  const { subscription } = useSubscription();
  const { toast } = useToast();
  
  const [topics, setTopics] = useState<string[]>(initialTopics);
  const [newTopic, setNewTopic] = useState('');
  const [platforms, setPlatforms] = useState<SocialPlatform[]>([
    SocialPlatform.INSTAGRAM,
    SocialPlatform.TWITTER,
    SocialPlatform.FACEBOOK
  ]);
  const [calendarPeriod, setCalendarPeriod] = useState<'week' | 'month'>('week');
  const [postsPerWeek, setPostsPerWeek] = useState<number>(3);
  const [balanceStrategy, setBalanceStrategy] = useState<'balanced' | 'focused'>('balanced');
  const [industry, setIndustry] = useState<string>('general');
  
  const [generatedSchedule, setGeneratedSchedule] = useState<ContentScheduleItem[]>([]);
  const [generateEnabled, setGenerateEnabled] = useState(true);
  
  const userTier = subscription?.tier || 'creator';
  const canUseEnterpriseFeatures = userTier === 'enterprise';
  
  // Add new topic to list
  const handleAddTopic = () => {
    if (newTopic.trim() && !topics.includes(newTopic.trim())) {
      setTopics([...topics, newTopic.trim()]);
      setNewTopic('');
    }
  };
  
  // Remove topic from list
  const handleRemoveTopic = (index: number) => {
    setTopics(topics.filter((_, i) => i !== index));
  };
  
  // Toggle platform selection
  const togglePlatform = (platform: SocialPlatform) => {
    if (platforms.includes(platform)) {
      setPlatforms(platforms.filter(p => p !== platform));
    } else {
      setPlatforms([...platforms, platform]);
    }
  };
  
  // Handle calendar generation using available APIs
  const handleGenerateCalendar = async () => {
    if (platforms.length === 0) {
      toast({
        title: "Platforms required",
        description: "Please select at least one platform"
      });
      return;
    }
    
    if (!canUseEnterpriseFeatures) {
      toast({
        title: "Enterprise feature",
        description: "Calendar generation requires an Enterprise subscription"
      });
      return;
    }
    
    try {
      // First, get optimal posting times for each platform
      const platformPostingTimes: Record<SocialPlatform, string[]> = {} as Record<SocialPlatform, string[]>;
      
      for (const platform of platforms) {
        const timesResult = await suggestPostingTime(platform);
        
        if (timesResult) {
          // Extract recommended posting times from the API response
          if (timesResult.times && Array.isArray(timesResult.times)) {
            platformPostingTimes[platform] = timesResult.times.slice(0, 3);
          } else if (timesResult.recommendations && Array.isArray(timesResult.recommendations)) {
            platformPostingTimes[platform] = timesResult.recommendations
              .map((rec: { time?: string, day?: string }) => rec.time || '')
              .filter(Boolean)
              .slice(0, 3);
          } else {
            platformPostingTimes[platform] = getDefaultPostingTimes(platform);
          }
        } else {
          platformPostingTimes[platform] = getDefaultPostingTimes(platform);
        }
      }
      
      // Then generate content types and distribution using AI
      const totalPosts = calendarPeriod === 'week' ? postsPerWeek : postsPerWeek * 4;
      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      
      // Generate topic ideas if none provided
      let contentTopics = [...topics];
      if (contentTopics.length === 0) {
        // Generate some default topics based on platforms
        const topicsPerPlatform: string[] = [];
        for (const platform of platforms) {
          const defaultTopics = getDefaultTopics(platform);
          topicsPerPlatform.push(...defaultTopics);
        }
        contentTopics = topicsPerPlatform.slice(0, Math.min(10, topicsPerPlatform.length));
      }
      
      // Create platform distribution based on strategy
      let platformDistribution: SocialPlatform[] = [];
      
      if (balanceStrategy === 'balanced') {
        // Equal distribution across platforms
        for (let i = 0; i < totalPosts; i++) {
          platformDistribution.push(platforms[i % platforms.length]);
        }
      } else {
        // Focused on primary platforms with less on secondary
        const primaryPlatform = platforms[0];
        const secondaryPlatforms = platforms.slice(1);
        
        // 60% primary, 40% secondary
        const primaryCount = Math.ceil(totalPosts * 0.6);
        for (let i = 0; i < primaryCount; i++) {
          platformDistribution.push(primaryPlatform);
        }
        
        for (let i = 0; i < (totalPosts - primaryCount); i++) {
          if (secondaryPlatforms.length > 0) {
            platformDistribution.push(secondaryPlatforms[i % secondaryPlatforms.length]);
          } else {
            platformDistribution.push(primaryPlatform);
          }
        }
      }
      
      // Create the content schedule
      const schedule: ContentScheduleItem[] = [];
      
      for (let i = 0; i < totalPosts; i++) {
        // Calculate day index
        const dayIndex = calendarPeriod === 'week' 
          ? (i % daysOfWeek.length) 
          : Math.floor(i / (totalPosts / 7)) % 7;
          
        const platform = platformDistribution[i];
        const platformTimes = platformPostingTimes[platform];
        const contentTypes = getContentTypesForPlatform(platform);
        
        // Select a topic
        const topicIndex = i % contentTopics.length;
        const topic = contentTopics[topicIndex];
        
        // Select a time
        const timeIndex = i % platformTimes.length;
        const time = platformTimes[timeIndex];
        
        // Select a content type
        const contentTypeIndex = i % contentTypes.length;
        const contentType = contentTypes[contentTypeIndex];
        
        // Create schedule item
        const scheduleItem: ContentScheduleItem = {
          day: daysOfWeek[dayIndex],
          time: time,
          platform: platform,
          contentType: contentType,
          topic: topic,
          notes: getDefaultNotes(platform, contentType)
        };
        
        schedule.push(scheduleItem);
      }
      
      // Add week numbers for monthly calendar
      if (calendarPeriod === 'month') {
        for (let i = 0; i < schedule.length; i++) {
          const weekNumber = Math.floor(i / (totalPosts / 4)) + 1;
          schedule[i].day = `Week ${weekNumber} - ${schedule[i].day}`;
        }
      }
      
      // Update state with generated schedule
      setGeneratedSchedule(schedule);
      
      toast({
        title: "Calendar generated",
        description: `Generated a ${calendarPeriod}ly content calendar for ${platforms.length} platform(s)`
      });
    } catch (err) {
      console.error('Error generating calendar:', err);
      toast({
        title: "Generation failed",
        description: error ? error.message : "Failed to generate calendar. Please try again."
      });
    }
  };
  
  // Default posting times for platforms
  const getDefaultPostingTimes = (platform: SocialPlatform): string[] => {
    switch (platform) {
      case SocialPlatform.INSTAGRAM:
        return ['12:00 PM', '3:00 PM', '7:00 PM'];
      case SocialPlatform.TWITTER:
        return ['8:00 AM', '12:00 PM', '5:00 PM'];
      case SocialPlatform.FACEBOOK:
        return ['9:00 AM', '1:00 PM', '3:00 PM'];
      case SocialPlatform.LINKEDIN:
        return ['9:00 AM', '12:00 PM', '5:00 PM'];
      case SocialPlatform.TIKTOK:
        return ['10:00 AM', '2:00 PM', '8:00 PM'];
      default:
        return ['9:00 AM', '12:00 PM', '3:00 PM'];
    }
  };
  
  // Get content types for each platform
  const getContentTypesForPlatform = (platform: SocialPlatform): string[] => {
    switch (platform) {
      case SocialPlatform.INSTAGRAM:
        return ['Carousel Post', 'Story', 'Reel', 'Single Image', 'Carousel Post'];
      case SocialPlatform.TWITTER:
        return ['Text Tweet', 'Image Tweet', 'Poll', 'Thread', 'Quote Tweet'];
      case SocialPlatform.FACEBOOK:
        return ['Text Post', 'Image Post', 'Video', 'Link Share', 'Question Post'];
      case SocialPlatform.LINKEDIN:
        return ['Article', 'Text Post', 'Image Post', 'Document', 'Poll'];
      case SocialPlatform.TIKTOK:
        return ['Short Video', 'Tutorial', 'Trend Participation', 'Behind the Scenes', 'Q&A'];
      default:
        return ['Text Post', 'Image Post', 'Video', 'Link Share'];
    }
  };
  
  // Helper: Get default topics for a platform
  const getDefaultTopics = (platform: SocialPlatform): string[] => {
    const topicsByPlatform: Record<SocialPlatform, string[]> = {
      [SocialPlatform.INSTAGRAM]: [
        'Behind the scenes', 'Product showcase', 'User testimonial', 
        'Industry tips', 'Team spotlight'
      ],
      [SocialPlatform.TWITTER]: [
        'Industry news', 'Quick tip', 'Poll question', 
        'Product update', 'Customer spotlight'
      ],
      [SocialPlatform.FACEBOOK]: [
        'Company update', 'Customer story', 'Product feature', 
        'Industry insights', 'Community discussion'
      ],
      [SocialPlatform.LINKEDIN]: [
        'Industry report', 'Company culture', 'Professional insights', 
        'Product benefits', 'Career development'
      ],
      [SocialPlatform.TIKTOK]: [
        'Product demo', 'Trending challenge', 'How-to tutorial', 
        'Quick tips', 'Day in the life'
      ]
    } as Record<SocialPlatform, string[]>;
    
    return topicsByPlatform[platform] || topicsByPlatform[SocialPlatform.INSTAGRAM];
  };
  
  // Get default notes for content types
  const getDefaultNotes = (platform: SocialPlatform, contentType: string): string => {
    if (contentType.includes('Carousel')) {
      return 'Prepare 5-10 slides with consistent design';
    } else if (contentType.includes('Video') || contentType.includes('Reel')) {
      return 'Keep video under 60 seconds with captions';
    } else if (contentType.includes('Story')) {
      return 'Use interactive elements like polls or questions';
    } else if (contentType.includes('Article')) {
      return 'Include statistics and actionable insights';
    }
    return 'Focus on high-quality visuals and clear messaging';
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGenerateCalendar();
  };
  
  // Use generated calendar
  const handleUseCalendar = () => {
    onCalendarGenerated(generatedSchedule);
  };
  
  // Get platform icon
  const getPlatformIcon = (platform: SocialPlatform) => {
    switch (platform) {
      case SocialPlatform.INSTAGRAM: return '📸';
      case SocialPlatform.TWITTER: return '🐦';
      case SocialPlatform.FACEBOOK: return '👍';
      case SocialPlatform.TIKTOK: return '📱';
      case SocialPlatform.LINKEDIN: return '💼';
      default: return '📝';
    }
  };
  
  // Get platform name
  const getPlatformName = (platform: SocialPlatform) => {
    switch (platform) {
      case SocialPlatform.INSTAGRAM: return 'Instagram';
      case SocialPlatform.TWITTER: return 'Twitter';
      case SocialPlatform.FACEBOOK: return 'Facebook';
      case SocialPlatform.TIKTOK: return 'TikTok';
      case SocialPlatform.LINKEDIN: return 'LinkedIn';
      default: return 'Other';
    }
  };
  
  // Enterprise feature notice UI
  if (!canUseEnterpriseFeatures) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Content Calendar Generator</h2>
        
        <div className="bg-amber-50 border border-amber-200 rounded p-6 text-center">
          <h3 className="font-medium text-amber-800 mb-2">Enterprise Feature</h3>
          <p className="text-amber-700 mb-4">
            Content calendar generation is available with our Enterprise subscription.
          </p>
          <p className="text-sm text-amber-600 mb-6">
            Automatically create optimized content calendars based on your analytics
            data, industry best practices, and platform algorithms to maximize
            engagement and maintain a consistent posting schedule.
          </p>
          <button
            className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
            onClick={() => window.location.href = '/dashboard/settings/billing'}
          >
            Upgrade to Enterprise
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Content Calendar Generator</h2>
      
      {/* Token alerts for content generation */}
      <AITokenAlert 
        taskType={AITaskType.GENERATE_POST}
        onTokenValidation={setGenerateEnabled}
      />
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error.message}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="calendarPeriod">
                Calendar Period
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={`p-2 text-center border rounded ${
                    calendarPeriod === 'week' 
                      ? 'bg-indigo-100 border-indigo-300 text-indigo-700' 
                      : 'bg-gray-50 border-gray-200 text-gray-700'
                  }`}
                  onClick={() => setCalendarPeriod('week')}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  className={`p-2 text-center border rounded ${
                    calendarPeriod === 'month' 
                      ? 'bg-indigo-100 border-indigo-300 text-indigo-700' 
                      : 'bg-gray-50 border-gray-200 text-gray-700'
                  }`}
                  onClick={() => setCalendarPeriod('month')}
                >
                  Monthly
                </button>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="postsPerWeek">
                Posts Per Week
              </label>
              <select
                id="postsPerWeek"
                value={postsPerWeek}
                onChange={(e) => setPostsPerWeek(parseInt(e.target.value))}
                className="w-full p-2 border rounded"
              >
                <option value={1}>1 post/week (minimal)</option>
                <option value={3}>3 posts/week (recommended)</option>
                <option value={5}>5 posts/week (active)</option>
                <option value={7}>7 posts/week (intensive)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                How many posts to schedule each week
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="balanceStrategy">
                Platform Balance
              </label>
              <select
                id="balanceStrategy"
                value={balanceStrategy}
                onChange={(e) => setBalanceStrategy(e.target.value as 'balanced' | 'focused')}
                className="w-full p-2 border rounded"
              >
                <option value="balanced">Balanced (equal across platforms)</option>
                <option value="focused">Focused (prioritize primary platform)</option>
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="industry">
                Industry/Niche
              </label>
              <select
                id="industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="general">General</option>
                <option value="retail">Retail/E-commerce</option>
                <option value="tech">Technology/SaaS</option>
                <option value="food">Food/Restaurant</option>
                <option value="travel">Travel/Hospitality</option>
                <option value="finance">Finance/Banking</option>
                <option value="health">Health/Wellness</option>
                <option value="education">Education/Learning</option>
                <option value="creative">Creative/Arts</option>
              </select>
            </div>
          </div>
          
          <div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">
                Platforms <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  SocialPlatform.INSTAGRAM,
                  SocialPlatform.TWITTER,
                  SocialPlatform.FACEBOOK,
                  SocialPlatform.LINKEDIN,
                  SocialPlatform.TIKTOK
                ].map((platform) => (
                  <button
                    key={platform}
                    type="button"
                    className={`p-2 text-center border rounded flex items-center justify-center gap-2 ${
                      platforms.includes(platform) 
                        ? 'bg-indigo-100 border-indigo-300' 
                        : 'bg-gray-50 border-gray-200'
                    }`}
                    onClick={() => togglePlatform(platform)}
                  >
                    <span>{getPlatformIcon(platform)}</span>
                    <span>{getPlatformName(platform)}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Select the platforms to include in your content calendar
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">
                Content Topics (Optional)
              </label>
              <div className="flex mb-2">
                <input
                  type="text"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  className="flex-grow p-2 border rounded-l"
                  placeholder="Enter a content topic (e.g., Product showcase, Company news)"
                />
                <button
                  type="button"
                  onClick={handleAddTopic}
                  className="bg-indigo-500 text-white px-4 py-2 rounded-r hover:bg-indigo-600"
                  disabled={!newTopic.trim()}
                >
                  Add
                </button>
              </div>
              {topics.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {topics.map((topic, index) => (
                    <div key={index} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded flex items-center">
                      <span>{topic}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTopic(index)}
                        className="ml-2 text-indigo-500 hover:text-indigo-700"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500">
                Add specific topics to include in your calendar (if empty, we'll generate topics for you)
              </p>
            </div>
          </div>
        </div>
        
        <button
          type="submit"
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          disabled={loading || !generateEnabled || platforms.length === 0}
        >
          {loading ? 'Generating...' : 'Generate Content Calendar'}
        </button>
      </form>
      
      {/* Results section */}
      {generatedSchedule.length > 0 && (
        <div className="border-t pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">Generated Content Calendar</h3>
            <button
              onClick={handleUseCalendar}
              className="px-3 py-1 bg-[#00CC44] text-white rounded hover:bg-[#00AA33]"
            >
              Use Calendar
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Day
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Platform
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Content Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Topic
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {generatedSchedule.map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.day}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.time}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="mr-1">{getPlatformIcon(item.platform)}</span>
                        <span className="text-sm text-gray-900">{getPlatformName(item.platform)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.contentType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.topic}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {item.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      <div className="mt-6 text-sm text-gray-500">
        <h4 className="font-medium text-gray-600 mb-1">Calendar Planning Tips:</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>Maintain consistency with 3-5 posts per week</li>
          <li>Allocate 60% content creation and 40% content curation</li>
          <li>Repurpose content across platforms with format adaptations</li>
          <li>Schedule evergreen content between time-sensitive posts</li>
          <li>Analyze past performance to optimize future posting times</li>
        </ul>
      </div>
    </div>
  );
} 