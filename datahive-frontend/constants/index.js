import { AiOutlineHome } from 'react-icons/ai';
import { FaUsers, FaUserCircle, FaTrophy, FaPlusCircle } from 'react-icons/fa';
import { MdCampaign } from 'react-icons/md';

export const navigation = [
  {
    name: 'Home',
    href: '/home',
    icon: <AiOutlineHome className="bg-transparent" />,
  },
  {
    name: 'Campaigns',
    href: '/campaigns',
    icon: <MdCampaign className="bg-transparent" />,
  },
  // {
  //   name: 'Marketplace',
  //   href: '/marketplace',
  //   icon: <FaExchangeAlt className="bg-transparent" />,
  // },
  {
    name: 'Profile',
    href: '/profile',
    icon: <FaUserCircle className="bg-transparent" />,
  },
  // {
  //   name: 'Challenges',
  //   href: '/challenges',
  //   icon: <MdOutlineTaskAlt className="bg-transparent" />,
  // },
  {
    name: 'Leaderboard',
    href: '/leaderboard',
    icon: <FaTrophy className="bg-transparent" />,
  },
  {
    name: 'Create Campaign',
    href: '/create-campaign',
    icon: <FaPlusCircle className="bg-transparent" />,
    isPrimary: true,
  },
];

export const startingFeatures = [
  'AI image generation platform: Create stunning visuals from text, high-resolution, intuitive interface.',
  'AI-guided image prompt generation: Effortlessly craft detailed prompts, enhance creativity, intuitive suggestions.',
  'Prompt Marketplace: Diverse library of creative prompts, user-contributed content for enhanced creativity.',
];

export const NETWORK = process.env.NEXT_PUBLIC_APP_NETWORK ?? 'testnet';
export const MODULE_ADDRESS = process.env.NEXT_PUBLIC_CAMPAIGN_MANAGER_ADDRESS;
export const CREATOR_ADDRESS = process.env.NEXT_PUBLIC_CREATOR_ADDRESS;
export const IS_DEV = Boolean(process.env.DEV);
