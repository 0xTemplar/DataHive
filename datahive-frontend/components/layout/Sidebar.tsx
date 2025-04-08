import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { navigation } from '@/constants';
import { MdOutlineSettings } from 'react-icons/md';
import { FaDiceD20 } from 'react-icons/fa6';
import { FaRegQuestionCircle, FaMediumM, FaFacebookF } from 'react-icons/fa';
import { BsTwitterX, BsDiscord } from 'react-icons/bs';

const Sidebar = () => {
  const router = useRouter();

  return (
    <>
      <nav
        className="hidden custom-scrollbar fixed top-0 left-0  shadow-2xl items-center h-screen w-[230px] right-0 navbar mt-0 md:block border-r-[1px] border-gray-800"
        style={{ maxWidth: '100vw', overflowX: 'auto' }}
        aria-label="Sidebar"
      >
        <Link className="flex items-center ml-7 mt-6  " href="/">
          <FaDiceD20 className="text-white text-[24px] " />
          &nbsp;&nbsp;
          <h2 className="font-extrabold text-[24px] leading-[30px] text-white">
            DataHive{' '}
          </h2>
        </Link>

        <ul className="list-none mt-8 ml-3 flex flex-col sm:flex justify-start items-start gap-2 flex-1 text-gray-300 ">
          {navigation.map((item) => (
            <Link key={item.name} href={item.href} scroll={false}>
              <span
                className={`font-poppins flex items-center font-normal cursor-pointer text-[12px] p-2 ${
                  router.pathname == item.href
                    ? 'text-white w-[210px] font-semibold gradient-border rounded-md transition-all duration-500'
                    : 'text-gray-400 hover:opacity-80'
                } `}
              >
                <div
                  className={`text-[16px] ${
                    item.isPrimary ? 'text-white' : ''
                  } bg-transparent`}
                >
                  {item.icon}
                </div>
                &nbsp;&nbsp;&nbsp;&nbsp;
                <div
                  className={`text-[13px] ${
                    item.isPrimary ? 'text-white' : ''
                  } bg-transparent flex items-center gap-2`}
                >
                  {item.name}
                  {item.isPrimary && (
                    <span className="bg-white/20 text-[10px] px-2 py-0.5 rounded-full">
                      New
                    </span>
                  )}
                </div>
              </span>
            </Link>
          ))}

          <li className="flex flex-col ml-2 mt-10">
            <span className="flex items-center text-gray-400 text-[13px]">
              {' '}
              <MdOutlineSettings className="text-[16px] group-hover: text-gray-400" />
              &nbsp; Settings
            </span>
            <span className="flex items-center text-gray-400 mt-4 text-[13px]">
              <FaRegQuestionCircle className="text-[16px]  group-hover: " />
              &nbsp; FAQ & Support
            </span>

            <span className="flex items-center text-gray-400 mt-8 text-sm">
              &nbsp; Terms of Service
            </span>

            <span className="flex gap-3 items-center text-gray-400 mt-4">
              <BsTwitterX className="text-lg  group-hover: " />
              <BsDiscord className="text-lg  group-hover: " />
              <FaMediumM className="text-lg  group-hover: " />
              <FaFacebookF className="text-lg  group-hover: " />
            </span>
          </li>
        </ul>
      </nav>
    </>
  );
};

export default Sidebar;
