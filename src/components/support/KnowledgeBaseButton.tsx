import React, { useState, useEffect } from 'react';
import { Button, ButtonProps } from '../ui/button/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { useToast } from '../ui/use-toast';
import { 
  BookOpen, 
  Search, 
  Tag, 
  ExternalLink, 
  ChevronRight, 
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  Info,
  Loader2
} from 'lucide-react';

export interface KnowledgeArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  views: number;
  helpfulCount: number;
  unhelpfulCount: number;
}

export interface KnowledgeCategory {
  id: string;
  name: string;
  description: string;
  articleCount: number;
}

export interface KnowledgeBaseButtonProps extends Omit<ButtonProps, 'onClick'> {
  /**
   * Knowledge base categories
   */
  categories?: KnowledgeCategory[];
  /**
   * Function to search articles
   */
  onSearch?: (query: string) => Promise<KnowledgeArticle[]>;
  /**
   * Function to get popular articles
   */
  onGetPopular?: () => Promise<KnowledgeArticle[]>;
  /**
   * Function to get articles by category
   */
  onGetByCategory?: (categoryId: string) => Promise<KnowledgeArticle[]>;
  /**
   * Function to get article by ID
   */
  onGetArticle?: (articleId: string) => Promise<KnowledgeArticle>;
  /**
   * Function to provide feedback on article helpfulness
   */
  onFeedback?: (articleId: string, helpful: boolean) => Promise<void>;
  /**
   * Base URL for knowledge base (for "View in KB" links)
   */
  knowledgeBaseUrl?: string;
  /**
   * Whether the button is disabled
   */
  isDisabled?: boolean;
  /**
   * Whether to show only the icon
   */
  iconOnly?: boolean;
  /**
   * Button size
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Button variant
   */
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  /**
   * Optional class name for additional styling
   */
  className?: string;
}

/**
 * KnowledgeBaseButton - A component for accessing the knowledge base.
 * This component allows users to search and browse help articles, FAQs, and tutorials.
 */
const KnowledgeBaseButton: React.FC<KnowledgeBaseButtonProps> = ({
  categories = [],
  onSearch,
  onGetPopular,
  onGetByCategory,
  onGetArticle,
  onFeedback,
  knowledgeBaseUrl = '/help',
  isDisabled = false,
  iconOnly = false,
  size = 'sm',
  variant = 'outline',
  className = '',
  ...buttonProps
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KnowledgeArticle[]>([]);
  const [popularArticles, setPopularArticles] = useState<KnowledgeArticle[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<KnowledgeCategory | null>(null);
  const [categoryArticles, setCategoryArticles] = useState<KnowledgeArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean | null>(null);
  const { toast } = useToast();
  
  // Load popular articles when dialog opens
  useEffect(() => {
    if (isOpen && onGetPopular && popularArticles.length === 0) {
      loadPopularArticles();
    }
  }, [isOpen, onGetPopular]);
  
  const loadPopularArticles = async () => {
    if (!onGetPopular) return;
    
    setIsLoading(true);
    
    try {
      const articles = await onGetPopular();
      setPopularArticles(articles);
    } catch (err) {
      console.error('Error loading popular articles:', err);
      toast({
        title: "Failed to load articles",
        description: "Couldn't load popular articles. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSearch = async () => {
    if (!onSearch || !searchQuery.trim()) return;
    
    setIsLoading(true);
    setSelectedCategory(null);
    setSelectedArticle(null);
    setCategoryArticles([]);
    
    try {
      const results = await onSearch(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error('Error searching articles:', err);
      toast({
        title: "Search Failed",
        description: "Failed to search knowledge base. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  const handleSelectCategory = async (category: KnowledgeCategory) => {
    if (!onGetByCategory) return;
    
    setIsLoading(true);
    setSelectedCategory(category);
    setSelectedArticle(null);
    setSearchResults([]);
    setSearchQuery('');
    
    try {
      const articles = await onGetByCategory(category.id);
      setCategoryArticles(articles);
    } catch (err) {
      console.error('Error loading category articles:', err);
      toast({
        title: "Failed to load category",
        description: "Couldn't load articles for this category. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSelectArticle = async (articleId: string) => {
    if (!onGetArticle) return;
    
    setIsLoading(true);
    setFeedbackSubmitted(null);
    
    try {
      const article = await onGetArticle(articleId);
      setSelectedArticle(article);
    } catch (err) {
      console.error('Error loading article:', err);
      toast({
        title: "Failed to load article",
        description: "Couldn't load the article. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFeedback = async (helpful: boolean) => {
    if (!onFeedback || !selectedArticle) return;
    
    try {
      await onFeedback(selectedArticle.id, helpful);
      setFeedbackSubmitted(helpful);
      
      // Update local state for the article
      setSelectedArticle(prev => {
        if (!prev) return null;
        return {
          ...prev,
          helpfulCount: helpful ? prev.helpfulCount + 1 : prev.helpfulCount,
          unhelpfulCount: !helpful ? prev.unhelpfulCount + 1 : prev.unhelpfulCount
        };
      });
      
      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback on this article.",
      });
    } catch (err) {
      console.error('Error submitting feedback:', err);
      toast({
        title: "Failed to submit feedback",
        description: "Couldn't submit your feedback. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleBack = () => {
    if (selectedArticle) {
      setSelectedArticle(null);
      setFeedbackSubmitted(null);
    } else if (selectedCategory) {
      setSelectedCategory(null);
      setCategoryArticles([]);
    } else if (searchResults.length > 0) {
      setSearchResults([]);
      setSearchQuery('');
    }
  };
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };
  
  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled={isDisabled}
        onClick={() => setIsOpen(true)}
        {...buttonProps}
      >
        <BookOpen className="h-4 w-4 mr-2" />
        {!iconOnly && "Knowledge Base"}
      </Button>
      
      <Dialog
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <BookOpen className="h-5 w-5 text-blue-500 mr-2" />
              {selectedArticle ? selectedArticle.title : "Knowledge Base"}
            </DialogTitle>
            <DialogDescription>
              {selectedArticle 
                ? `Last updated: ${formatDate(selectedArticle.updatedAt)}`
                : "Search our knowledge base for help articles, FAQs, and tutorials."}
            </DialogDescription>
          </DialogHeader>
          
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              {/* Back button */}
              {(selectedCategory || selectedArticle || searchResults.length > 0) && (
                <button
                  onClick={handleBack}
                  className="flex items-center text-sm text-blue-600 hover:underline mb-4"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to {selectedArticle 
                    ? selectedCategory 
                      ? selectedCategory.name 
                      : searchResults.length > 0 
                        ? 'search results' 
                        : 'categories' 
                    : 'home'}
                </button>
              )}
              
              {/* Search bar */}
              {!selectedArticle && (
                <div className="mb-6 flex">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search knowledge base..."
                      className="w-full pl-10 pr-4 py-2 border rounded-l-md focus:ring-2 focus:ring-blue-300 focus:border-blue-500 focus:outline-none"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleKeyPress}
                    />
                  </div>
                  <Button
                    onClick={handleSearch}
                    className="rounded-l-none"
                    disabled={!searchQuery.trim()}
                  >
                    Search
                  </Button>
                </div>
              )}
              
              {/* Article view */}
              {selectedArticle && (
                <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="h-5 w-5 text-blue-500" />
                      <span className="text-sm font-medium text-blue-800">
                        Article Summary
                      </span>
                    </div>
                    <p className="text-sm text-blue-700">
                      {selectedArticle.summary}
                    </p>
                  </div>
                  
                  <div className="prose max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: selectedArticle.content }} />
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-4">
                    {selectedArticle.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full flex items-center"
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  <div className="border-t pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div>
                      <span className="text-xs text-gray-500">
                        Views: {selectedArticle.views} | 
                        Helpful: {selectedArticle.helpfulCount} | 
                        Not Helpful: {selectedArticle.unhelpfulCount}
                      </span>
                    </div>
                    
                    <div className="mt-3 sm:mt-0">
                      <div className="flex items-center">
                        <span className="text-sm mr-2">Was this article helpful?</span>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleFeedback(true)}
                            className={`p-1 rounded-full ${
                              feedbackSubmitted === true 
                                ? 'bg-green-100 text-green-600' 
                                : 'hover:bg-gray-100 text-gray-500'
                            }`}
                            disabled={feedbackSubmitted !== null}
                          >
                            <ThumbsUp className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleFeedback(false)}
                            className={`p-1 rounded-full ${
                              feedbackSubmitted === false 
                                ? 'bg-red-100 text-red-600' 
                                : 'hover:bg-gray-100 text-gray-500'
                            }`}
                            disabled={feedbackSubmitted !== null}
                          >
                            <ThumbsDown className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {feedbackSubmitted !== null && (
                        <p className="text-xs text-green-600 mt-1">
                          Thank you for your feedback!
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-center mt-4">
                    <a
                      href={`${knowledgeBaseUrl}/article/${selectedArticle.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center text-sm"
                    >
                      View in Knowledge Base
                      <ExternalLink className="h-4 w-4 ml-1" />
                    </a>
                  </div>
                </div>
              )}
              
              {/* Search results */}
              {!selectedArticle && searchResults.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-4">
                    Search Results ({searchResults.length})
                  </h3>
                  {searchResults.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      No results found for "{searchQuery}". Try a different search term.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {searchResults.map((article) => (
                        <div
                          key={article.id}
                          className="border p-4 rounded-md hover:border-blue-300 transition-colors cursor-pointer"
                          onClick={() => handleSelectArticle(article.id)}
                        >
                          <div className="flex justify-between">
                            <h4 className="font-medium">{article.title}</h4>
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                          </div>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {article.summary}
                          </p>
                          <div className="flex items-center mt-2">
                            <span className="text-xs text-gray-500 mr-3">
                              Category: {article.category}
                            </span>
                            <span className="text-xs text-gray-500">
                              Updated: {formatDate(article.updatedAt)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Category articles */}
              {!selectedArticle && selectedCategory && categoryArticles.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-1">
                    {selectedCategory.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {selectedCategory.description}
                  </p>
                  
                  <div className="space-y-4">
                    {categoryArticles.map((article) => (
                      <div
                        key={article.id}
                        className="border p-4 rounded-md hover:border-blue-300 transition-colors cursor-pointer"
                        onClick={() => handleSelectArticle(article.id)}
                      >
                        <div className="flex justify-between">
                          <h4 className="font-medium">{article.title}</h4>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {article.summary}
                        </p>
                        <div className="flex items-center mt-2 text-xs text-gray-500">
                          <span>Updated: {formatDate(article.updatedAt)}</span>
                          <span className="mx-2">•</span>
                          <span>Views: {article.views}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Home view (categories + popular articles) */}
              {!selectedArticle && !selectedCategory && searchResults.length === 0 && (
                <div className="space-y-8">
                  {/* Categories */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Categories</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {categories.map((category) => (
                        <div
                          key={category.id}
                          className="border p-4 rounded-md hover:border-blue-300 transition-colors cursor-pointer"
                          onClick={() => handleSelectCategory(category)}
                        >
                          <div className="flex justify-between">
                            <h4 className="font-medium">{category.name}</h4>
                            <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                              {category.articleCount} articles
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {category.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Popular articles */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Popular Articles</h3>
                    <div className="space-y-3">
                      {popularArticles.length === 0 ? (
                        <p className="text-center text-gray-500 py-4">
                          Loading popular articles...
                        </p>
                      ) : (
                        popularArticles.map((article) => (
                          <div
                            key={article.id}
                            className="flex items-center p-3 border-l-2 border-transparent hover:border-blue-500 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                            onClick={() => handleSelectArticle(article.id)}
                          >
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{article.title}</h4>
                              <span className="text-xs text-gray-500">
                                {article.category}
                              </span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-center pt-4 border-t">
                    <a
                      href={knowledgeBaseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center"
                    >
                      Browse all articles in Knowledge Base
                      <ExternalLink className="h-4 w-4 ml-1" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default KnowledgeBaseButton; 