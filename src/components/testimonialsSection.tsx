"use client"
import { useState } from "react"
import { Star } from "lucide-react"

interface Testimonial {
  id: number
  name: string
  title: string
  company: string
  rating: number
  text: string
  avatar: string
}

const allTestimonials: Testimonial[] = [
  // First slide
  {
    id: 1,
    name: "Priya S.",
    title: "Digital Strategist",
    company: "Lifestyle Brand",
    rating: 4,
    text: "Their ability to analyze sentiment and audience fit saved us from costly mistakes. We now confidently launch multi-influencer campaigns in a fraction of the time.",
    avatar: "/images/profile2.png",
  },
  {
    id: 2,
    name: "Sarah M.",
    title: "Growth Manager",
    company: "Fintech Startup",
    rating: 4,
    text: "We cut our campaign planning time in half using their AI tools. The system recommended influencers and creatives that delivered a 40% higher ROI compared to our manual picks.",
    avatar: "/images/profile4.jpg",
  },
  {
    id: 3,
    name: "David R.",
    title: "Marketing Director",
    company: "eCommerce Brand",
    rating: 5,
    text: "The balance between automation and insight is spot-on. AI surfaces actionable ideas, while the team supports us like doubled our lead conversions.",
    avatar: "/images/profile5.jpg",
  },
  // Second slide
  {
    id: 4,
    name: "Lisa K.",
    title: "Brand Manager",
    company: "Fashion Startup",
    rating: 5,
    text: "The platform transformed our influencer marketing strategy. We saw a 60% increase in engagement rates and significantly better brand alignment with our chosen influencers.",
    avatar: "/images/profile4.jpg",
  },
  {
    id: 5,
    name: "Mike T.",
    title: "CEO",
    company: "Tech Company",
    rating: 4,
    text: "Outstanding results! The AI recommendations helped us identify micro-influencers who delivered exceptional ROI. Our conversion rates improved by 45% in just two months.",
    avatar: "/images/profile3.png",
  },
  {
    id: 6,
    name: "Anna P.",
    title: "Social Media Lead",
    company: "Beauty Brand",
    rating: 5,
    text: "Game-changer for our team! The sentiment analysis feature alone saved us from potential PR disasters. Now we can confidently scale our influencer partnerships.",
    avatar: "/images/profile3.png",
  },
  // Third slide
  {
    id: 7,
    name: "James W.",
    title: "Marketing VP",
    company: "Food & Beverage",
    rating: 4,
    text: "Incredible platform that streamlined our entire influencer workflow. The automated reporting and performance tracking features are exactly what we needed.",
    avatar: "/images/profile3.png",
  },
  {
    id: 8,
    name: "Sophie L.",
    title: "Content Director",
    company: "Travel Agency",
    rating: 5,
    text: "The creative recommendations feature is phenomenal. It helped us maintain brand consistency across all our influencer collaborations while boosting engagement.",
    avatar: "/images/profile3.png",
  },
  {
    id: 9,
    name: "Ryan M.",
    title: "Growth Lead",
    company: "SaaS Startup",
    rating: 5,
    text: "Best investment we made this year! The platform's AI-driven insights helped us optimize our influencer budget and achieve 3x better results than traditional methods.",
    avatar: "/images/profile3.png",
  },
]

const StarRating = ({ rating }: { rating: number }) => {
  return (
    <div className="flex gap-1 mb-4">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${star <= rating ? "fill-orange-400 text-orange-400" : "fill-gray-200 text-gray-200"}`}
        />
      ))}
    </div>
  )
}

const TestimonialCard = ({ testimonial, index }: { testimonial: Testimonial; index: number }) => {
  return (
    <div
      className={`bg-[#F5F5F7] rounded-xl p-4 shadow-sm h-full flex flex-col max-w-lg mx-auto transition-all duration-300 ${
        index === 0 || index === 2 ? "mt-8" : ""
      }`}
      style={{ maxWidth: '580px' }}
    >

      <div className="flex justify-center mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${star <= testimonial.rating ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"}`}
          />
        ))}
      </div>
      <p className="text-gray-500 text-sm leading-relaxed text-center flex-grow">
        {testimonial.text}
      </p>
 <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 mx-auto">
        <img
          src={testimonial.avatar || "/placeholder.svg"}
          alt={testimonial.name}
          className="w-full h-full object-cover"
        />
      </div>
      <h4 className="font-semibold text-gray-900 text-lg text-center mb-2">
        {testimonial.name}
      </h4>
      {/* Author Title and Company - at the bottom */}
      <div className="text-center">
        <p className="text-gray-500 text-sm">
          {testimonial.title}, {testimonial.company}
        </p>
      </div>
    </div>
  );
}

const NavigationDots = ({
  total,
  current,
  onChange,
}: {
  total: number
  current: number
  onChange: (index: number) => void
}) => {
  return (
    <div className="flex justify-center gap-2 mt-8">
      {Array.from({ length: total }).map((_, index) => (
        <button
          key={index}
          onClick={() => onChange(index)}
          className={`w-2 h-2 rounded-full transition-colors duration-200 cursor-pointer hover:scale-110 ${
            index === current ? "bg-green-500" : "bg-gray-300 hover:bg-gray-400"
          }`}
          aria-label={`Go to slide ${index + 1}`}
        />
      ))}
    </div>
  )
}

export default function TestimonialsSection() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const testimonialsPerSlide = 3
  const totalSlides = Math.ceil(allTestimonials.length / testimonialsPerSlide)

  const getCurrentTestimonials = () => {
    const startIndex = currentSlide * testimonialsPerSlide
    return allTestimonials.slice(startIndex, startIndex + testimonialsPerSlide)
  }

  const handleDotClick = (slideIndex: number) => {
    setCurrentSlide(slideIndex)
  }

  return (
    <section className="py-16 px-4 bg-gray-50 min-h-screen justify-center flex items-center ">
      <div className="max-w-full overflow-x-clip ">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
            What our <span className="text-green-500">client</span> are saying
          </h2>
          <p className="text-gray-500 text-lg">The success of our users speaks louder than words</p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16   ">
          {getCurrentTestimonials().map((testimonial, index) => (
            <TestimonialCard key={testimonial.id} testimonial={testimonial} index={index} />
          ))}
        </div>

        {/* Navigation Dots */}
        <NavigationDots total={totalSlides} current={currentSlide} onChange={handleDotClick} />
      </div>
    </section>
  )
}
