import React, { useState, useEffect } from 'react';
import { FiSearch, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import Link from 'next/link';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface FAQCategory {
  name: string;
  faqs: FAQ[];
}

const FAQSection: React.FC = () => {
  const [categories, setCategories] = useState<FAQCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FAQ[]>([]);
  const [expandedFAQs, setExpandedFAQs] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Fetch categories and FAQs on component mount
  useEffect(() => {
    async function fetchCategoriesAndFAQs() {
      try {
        // Fetch categories
        const categoriesResponse = await fetch('/api/support/faqs/categories/list');
        
        if (!categoriesResponse.ok) {
          throw new Error('Failed to fetch categories');
        }
        
        const categoriesData = await categoriesResponse.json();
        const categoryNames = categoriesData.data || [];
        
        // Fetch FAQs for each category
        const categoryPromises = categoryNames.map(async (category: string) => {
          const faqsResponse = await fetch(`/api/support/faqs/categories/${category}`);
          
          if (!faqsResponse.ok) {
            return { name: category, faqs: [] };
          }
          
          const faqsData = await faqsResponse.json();
          return {
            name: category,
            faqs: faqsData.data || []
          };
        });
        
        const categoriesWithFAQs = await Promise.all(categoryPromises);
        setCategories(categoriesWithFAQs);
        
        // Set the first category as active by default
        if (categoriesWithFAQs.length > 0) {
          setActiveCategory(categoriesWithFAQs[0].name);
        }
      } catch (error) {
        console.error('Error fetching FAQs:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchCategoriesAndFAQs();
  }, []);

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      const response = await fetch('/api/support/faqs/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: searchQuery,
          limit: 10
        })
      });
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const data = await response.json();
      const results = data.data.map((item: any) => item.faq);
      
      setSearchResults(results);
      
      // Expand all search results
      const newExpandedFAQs = new Set(expandedFAQs);
      results.forEach((faq: FAQ) => {
        newExpandedFAQs.add(faq.id);
      });
      setExpandedFAQs(newExpandedFAQs);
    } catch (error) {
      console.error('Error searching FAQs:', error);
      setSearchResults([]);
    }
  };

  // Toggle FAQ expansion
  const toggleFAQ = (faqId: string) => {
    const newExpandedFAQs = new Set(expandedFAQs);
    
    if (newExpandedFAQs.has(faqId)) {
      newExpandedFAQs.delete(faqId);
    } else {
      newExpandedFAQs.add(faqId);
    }
    
    setExpandedFAQs(newExpandedFAQs);
  };

  // Set active category
  const setCategory = (category: string) => {
    setActiveCategory(category);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Get FAQs to display (either search results or category FAQs)
  const displayFAQs = searchQuery.trim() 
    ? searchResults
    : categories.find(c => c.name === activeCategory)?.faqs || [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">Frequently Asked Questions</h1>
      
      {/* Search bar */}
      <div className="mb-8">
        <div className="relative max-w-md mx-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search for answers..."
            className="w-full px-4 py-3 pl-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="text-gray-400" />
          </div>
          <button
            onClick={handleSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-indigo-600 hover:text-indigo-800"
          >
            Search
          </button>
        </div>
      </div>
      
      {isLoading ? (
        // Loading state
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Categories sidebar on desktop */}
          <div className="hidden md:block">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Categories</h2>
            <ul className="space-y-2">
              {categories.map((category) => (
                <li key={category.name}>
                  <button
                    onClick={() => setCategory(category.name)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      activeCategory === category.name
                        ? 'bg-indigo-100 text-indigo-800 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {category.name} ({category.faqs.length})
                  </button>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Dropdown for categories on mobile */}
          <div className="md:hidden mb-6">
            <select
              value={activeCategory || ''}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {categories.map((category) => (
                <option key={category.name} value={category.name}>
                  {category.name} ({category.faqs.length})
                </option>
              ))}
            </select>
          </div>
          
          {/* FAQ list */}
          <div className="md:col-span-3">
            {searchQuery.trim() && (
              <h2 className="text-xl font-semibold mb-4">
                {searchResults.length === 0
                  ? 'No results found'
                  : `Search results for "${searchQuery}"`}
              </h2>
            )}
            
            {!searchQuery.trim() && activeCategory && (
              <h2 className="text-xl font-semibold mb-4 md:hidden">
                {activeCategory}
              </h2>
            )}
            
            {displayFAQs.length === 0 && !isLoading ? (
              <div className="text-center py-12 text-gray-500">
                {searchQuery.trim() 
                  ? 'No results found. Try a different search term.' 
                  : 'No FAQs available for this category.'}
              </div>
            ) : (
              <ul className="space-y-4">
                {displayFAQs.map((faq) => (
                  <li 
                    key={faq.id} 
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => toggleFAQ(faq.id)}
                      className="w-full text-left p-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
                    >
                      <h3 className="font-medium text-gray-900">{faq.question}</h3>
                      {expandedFAQs.has(faq.id) ? (
                        <FiChevronUp className="flex-shrink-0 text-gray-500" />
                      ) : (
                        <FiChevronDown className="flex-shrink-0 text-gray-500" />
                      )}
                    </button>
                    
                    {expandedFAQs.has(faq.id) && (
                      <div className="p-4 pt-0 bg-gray-50">
                        <div className="prose max-w-none text-gray-700">
                          {faq.answer.split('\n').map((paragraph, i) => (
                            <p key={i}>{paragraph}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      
      {/* Need more help section */}
      <div className="mt-12 p-6 bg-indigo-50 rounded-lg text-center">
        <h2 className="text-xl font-semibold text-indigo-900 mb-2">Need more help?</h2>
        <p className="text-indigo-700 mb-4">
          Can&apos;t find what you&apos;re looking for? Our support team is ready to assist you.
        </p>
        <div className="space-x-4">
          <Link href="/support/faq">
            View more FAQs
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FAQSection; 