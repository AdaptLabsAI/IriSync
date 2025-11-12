"use client"
import Image from "next/image"
import {
  Building2,
  Mail,
  Phone,
  Search,
  Bell,
  MoreHorizontal,
  Settings,
  Crown,
  Edit,
  ArrowLeft,
  ArrowRight,
  Badge,
  BadgeAlert,
  X,
  Instagram,
  BellDot,
  CirclePlus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { BsInstagram, BsLinkedin, BsTelegram, BsWhatsapp } from "react-icons/bs"
import { PiCoinVertical } from "react-icons/pi";
import { useState } from "react"
export default function Dashboard() {
  const teamMembers = [
    {
      name: "Mike Anderson",
      role: "Admin • Manager",
      avatar: "/images/user.jpg",
      initials: "MA",
    },
    {
      name: "Kristin Watson",
      role: "Admin • Manager",
      avatar: "/images/user1.jpg",
      initials: "KW",
    },
    {
      name: "Darrell Steward",
      role: "Team Member",
      avatar: "/images/user2.jpg",
      initials: "DS",
    },
    {
      name: "Annette Black",
      role: "Team Member",
      avatar: "/images/user.jpg",
      initials: "AB",
    },
    {
      name: "Jannie Cooper",
      role: "Team Member",
      avatar: "/images/user1.jpg",
      initials: "JC",
    },
  ]

 const [socialAccounts, setSocialAccounts] = useState([
  {
    platform: "WhatsApp Business",
    handle: "+1 23 456 7890",
    icon: <BsWhatsapp className="w-5 h-5" />,
    color: "bg-green-500",
    connected: true,
  },
  {
    platform: "Telegram for business",
    handle: "+1 23 456 7890",
    icon: <BsTelegram />,
    color: "bg-blue-500",
    connected: true,
  },
  {
    platform: "Instagram",
    handle: "@weareblackrust",
    icon: <BsInstagram />,
    color: "bg-pink-500",
    connected: true,
  },
  {
    platform: "X",
    handle: "@weareblackrust",
    icon: <X />,
    color: "bg-black",
    connected: false,
  },
  {
    platform: "LinkedIn",
    handle: "@weareblackrust",
    icon: <BsLinkedin className="w-5 h-5" />,
    color: "bg-blue-600",
    connected: false,
  },
]);
const toggleConnection = (index: number) => {
  setSocialAccounts((prev) =>
    prev.map((account, i) =>
      i === index ? { ...account, connected: !account.connected } : account
    )
  );
};
  const texts = [
    {
      message: "Few leads require urgent attention. Check it out",
      sub: "Channel • WhatsApp",
    },
    {
      message: "3 new messages awaiting your response",
      sub: "Channel • Facebook Messenger",
    },
    {
      message: "Your scheduled post needs approval",
      sub: "Channel • Instagram",
    },
    {
      message: "5 leads added to your pipeline",
      sub: "Channel • LinkedIn",
    },
    {
      message: "Campaign performance report is ready",
      sub: "Channel • Email",
    },
  ];

  const [index, setIndex] = useState(0);

  const handlePrev = () => {
    setIndex((prev) => (prev - 1 + texts.length) % texts.length);
  };

  const handleNext = () => {
    setIndex((prev) => (prev + 1) % texts.length);
  };

  return (
    <div className="bg-gray-50">
      {/* Header */}
   {/* <header className="bg-white shadow-sm px-4 py-4 sm:px-6">
  <div className="flex items-center justify-end w-full">
    <div className="flex items-center space-x-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input 
          placeholder="Search" 
          className="pl-10 pr-4 py-2 rounded-full w-40 md:w-80 bg-gray-50 border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500" 
        />
      </div>
      <BellDot className="text-gray-400 w-5 h-5 cursor-pointer" />
    </div>
  </div>
</header> */}

      <div className="w-full  py-6 grid grid-cols-1 lg:grid-cols-12 gap-1">
        {/* Left Column - Profile */}
        <div className="lg:col-span-3 space-y-2">
          <div className="mt-2 shadow-sm ">
            <div className="absolute text-sm top-4 right-4 px-2 py-1 bg-white rounded-full">
              CREATOR
            </div>
            <div className="pt-16 pb-2">
              <div className="text-center">
                <div className="relative w-full rounded-2xl h-88 -mt-[70px]">
                  <Image
                    src="/images/pro.jpg"
                    alt="Sophia Adam"
                    fill
                    className="object-cover rounded-2xl"
                  />
                </div>
            <div className="p-2">
                <div className="flex items-center justify-between mb-1 py-2 ">
                  <div className="text-3xl"><span className="text-black font-bold ">Sophia</span>  <span className="text-gray-600">Adam</span></div>
                  <div className="flex items-center shadow-lg rounded-full p-1 ">
                    <PiCoinVertical  className="w-4 h-4 text-yellow-500 mr-1" />
                    
                    <span className="text-[12px] ">8090</span>
                    <CirclePlus className="w-4 h-4 text-yellow-500 ml-1" />
                   
                  </div>
                </div>
                <div className="flex text-sm text-gray-600 mb-1">
                  <Building2 className="w-4 h-4 mr-1" />
                  <span>CEO at <b> Black Rust Corp.</b></span>
                </div>
                <div className="flex text-sm text-gray-600">
                  <Mail className="w-4 h-4 mr-1" />
                  <span>sophia@blackrustcorp.com</span>
                </div>
              </div>

              <div className="flex space-x-2 ml-2 mt-3">
  {/* Edit Profile Button */}
  <button className="flex items-center px-4 py-2 rounded-xl border border-gray-300 text-black bg-white hover:bg-gray-100 transition-shadow shadow-sm space-x-2">
    <Edit className="w-5 h-8" />
    <span className="text-sm font-medium">Edit Profile</span>
  </button>

  {/* Upgrade Now Button */}
  <button className="flex items-center px-4 py-2 rounded-xl text-white font-medium bg-gradient-to-r from-[#00e676] to-[#005f30] hover:from-[#1aff84] hover:to-[#004d26] transition-shadow shadow-md space-x-2">
    <Crown className="w-5 h-8" />
    <span className="text-sm font-medium">Upgrade Now</span>
  </button>
</div>

              </div>
            </div>
          </div>

          {/* Actions Required */}
          <div className="rounded-lg bg-white shadow-sm">
      <div className="px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Actions Required</h2>
        <div className="flex space-x-1">
          <button
            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition"
            onClick={handlePrev}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition"
            onClick={handleNext}
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="px-4 py-3 flex items-start space-x-3">
        <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
        <div>
          <p className="text-sm font-medium text-gray-800">
            {texts[index].message}
          </p>
          <p className="text-xs text-gray-500 mt-1">{texts[index].sub}</p>
        </div>
      </div>
    </div>

        </div>

        {/* Center Column - Company & Team */}
        <div className="lg:col-span-6 space-y-2">
          {/* Company Info */}
          <Card>
            <div className="h-32 bg-gradient-to-br from-blue-100 to-white relative">
              <div className="absolute -bottom-16  left-3 w-26 h-26 sm:w-25 sm:h-25 rounded-full bg-white shadow-sm flex items-center justify-center">
                <div className="w-15 h-15 sm:w-16 sm:h-16 rounded-full flex items-center justify-center">
                  <span className="text-2xl sm:text-3xl font-bold text-blue-600">b</span>
                </div>
              </div>
            </div>
<CardContent className="pt-10 sm:px-6">
   <div className="flex ml-[100px] mt-[-32px] justify-between   items-start mb-6">
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold">Black Rust Corp.</h3>
                  <p className="text-gray-500 text-sm">IT Company</p>
                </div>
          <Button variant="ghost" size="icon" className="rounded-full border border-gray-200 ">
  <Settings className="w-5 h-5 text-gray-500" />
</Button>

              </div>

</CardContent>
            <CardContent className="pt-2 px-4 sm:px-2">
             
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-7  sm:gap-18 text-sm ">
                <div>
                  <div className="flex items-center text-gray-500 mb-1">
                    <Building2 className="w-4 h-4 mr-2 font-bold" />
                    Head Office
                  </div>
                  <p className="font-medium whitespace-nowrap text-gray-900">New York, United States</p>
                </div>

                <div>
                  <div className="flex items-center text-gray-500 mb-1">
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </div>
                  <p className="font-medium whitespace-nowrap text-gray-900 break-all">
                    contact@blackrustcorp.com
                  </p>
                </div>

                <div className="ml-5">
                  <div className="flex items-center text-gray-500 mb-1">
                    <Phone className="w-4 h-4 mr-2" />
                    Phone
                  </div>
                  <p className="font-medium whitespace-nowrap text-gray-900">+1 23 456 7890</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Section */}
          <div className="rounded-lg bg-white shadow-sm">
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Team Black Rust Corp.</h2>
                <p className="text-sm text-gray-600">3 Admin</p>
              </div>
              <button className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition">
                <Settings className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 space-y-5">
              {teamMembers.map((member, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-sm font-medium text-gray-700">
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        member.initials
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{member.name}</p>
                      <p className="text-sm text-gray-600">{member.role}</p>
                    </div>
                  </div>

                  <button className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Social & Billing */}
        <div className="lg:col-span-3 space-y-1">
          {/* Social Accounts */}
       <div className="bg-white rounded-lg shadow-sm">
      <div className="px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Social Accounts</h2>
        <button className="text-sm text-gray-600 hover:text-gray-800 transition">Connect more</button>
      </div>
      <div className="px-4 py-4 space-y-4">
        {socialAccounts.map((account, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 ${account.color} rounded-lg flex items-center justify-center text-white text-sm`}>
                {account.icon}
              </div>
              <div>
                <p className="font-medium text-sm text-gray-900">{account.handle}</p>
                <p className="text-xs text-gray-600">{account.platform}</p>
              </div>
            </div>
            <button
              onClick={() => toggleConnection(index)}
              className={`text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-md ${
                account.connected
                  ? "bg-white text-gray-600 hover:bg-gray-50 shadow-sm"
                  : "bg-green-600 text-white hover:bg-green-700"
              } transition`}
            >
              {account.connected ? "Disconnect" : "Connect"}
            </button>
          </div>
        ))}
      </div>
    </div>

          {/* Billing Info */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-4 py-3 mt-[6px]">
              <h2 className="text-lg font-semibold text-gray-800">Billing Info</h2>
            </div>

            <div className="px-4 py-4 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Crown className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-800">Creator</p>
                    <p className="text-xs  text-gray-600">Expires on 30 Jun 2025</p>
                  </div>
                </div>
                <button className="px-2 sm:px-3 py-3.5 text-xs sm:text-[13px] whitespace-nowrap bg-gradient-to-r from-[#00e676] to-[#005f30] hover:from-[#1aff84] hover:to-[#004d26] text-white rounded-md transition shadow-sm">
                  UPGRADE NOW
                </button>
              </div>

      <div className="max-w-xs rounded-xl overflow-hidden shadow-md bg-white">
  <div className="px-4 py-3">
    <div className="flex justify-between">
      <span className="text-gray-500 text-sm">Base Price</span>
      <span className="text-black font-semibold text-sm">$30.00</span>
    </div>
  </div>
  <div className="border-t border-gray-200" />
  <div className="px-4 py-3">
    <div className="flex justify-between">
      <span className="text-gray-500 text-sm">Tax</span>
      <span className="text-black font-semibold text-sm">$01.80</span>
    </div>
  </div>
  <div className="border-t border-gray-200" />
  <div className="px-4 py-3">
    <div className="flex justify-between">
      <span className="text-gray-500 text-sm">Discount</span>
      <span className="text-black font-semibold text-sm">$00.00</span>
    </div>
  </div>
  <div className="border-t border-gray-200" />
  <div className="px-4 py-3 bg-green-100 rounded-b-xl">
    <div className="flex justify-between">
      <span className="text-black font-semibold text-sm">Total Paid</span>
      <span className="text-black font-semibold text-sm">$31.80</span>
    </div>
  </div>
</div>


              <div className="flex items-center justify-between ">
                <div className="flex items-center space-x-0">
                  <Checkbox className="text-green-300" id="auto-renew" defaultChecked />
                  <label htmlFor="auto-renew" className="text-[13px] text-gray-700">
                    Auto renew - Never miss a beat
                  </label>
                </div>
                <button className="text-sm text-gray-600 hover:text-gray-800 transition">Invoice</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}