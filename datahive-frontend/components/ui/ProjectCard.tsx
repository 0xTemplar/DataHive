import React from 'react';
import Image from 'next/image';

interface BackerLogo {
  src: string;
  alt: string;
}

interface ProjectCardProps {
  name: string;
  tags: string[];
  funding?: string;
  status: string;
  backers: BackerLogo[];
  recommendedBy?: BackerLogo;
  activeTasks?: number;
  description?: string;
  logoSrc: string;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  name,
  tags,
  funding,
  status,
  backers,
  recommendedBy,
  activeTasks,
  description,
  logoSrc,
}) => {
  return (
    <div className="radial-gradient-border rounded-2xl p-6 ">
      <div className="flex items-start gap-4">
        {/* Project Logo */}
        <div className="w-12 h-12 rounded-full overflow-hidden bg-[#1E1B2C]">
          <Image src={logoSrc} alt={name} width={48} height={48} />
        </div>

        {/* Project Info */}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">{name}</h3>
            {activeTasks && (
              <div className="px-3 py-1 bg-gray-800 rounded-full text-sm text-white">
                Active Tasks {activeTasks}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="flex gap-2 mt-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-gray-800 rounded-full text-sm text-white"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Project Details */}
      <div className="grid grid-cols-2 gap-8 mt-6">
        <div>
          <p className="text-gray-400 text-sm mb-1">Funding</p>
          <p className="text-white font-medium">{funding || '--'}</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm mb-1">Status</p>
          <p className="text-white font-medium">{status}</p>
        </div>
      </div>

      {/* Backers and Recommendations */}
      <div className="grid grid-cols-2 gap-8 mt-6">
        <div>
          <p className="text-gray-400 text-sm mb-2">Backed By</p>
          <div className="flex -space-x-2">
            {backers.map((backer, index) => (
              <div
                key={index}
                className="w-8 h-8 rounded-full border-2 border-gray-800 overflow-hidden"
              >
                <Image
                  src={backer.src}
                  alt={backer.alt}
                  width={32}
                  height={32}
                />
              </div>
            ))}
          </div>
        </div>
        {recommendedBy && (
          <div>
            <p className="text-gray-400 text-sm mb-2">Recommend By</p>
            <div className="w-8 h-8 rounded-full border-2 border-gray-800 overflow-hidden">
              <Image
                src={recommendedBy.src}
                alt={recommendedBy.alt}
                width={32}
                height={32}
              />
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      {description && (
        <div className="mt-6">
          <p className="text-gray-400 text-sm">{description}</p>
        </div>
      )}
    </div>
  );
};

export default ProjectCard;
