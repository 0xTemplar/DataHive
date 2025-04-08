import React, { useState } from 'react';
import {
  HiOutlinePencil,
  HiOutlineDocumentText,
  HiOutlineClipboardCheck,
  HiOutlineCalendar,
  HiPlusCircle,
  HiX,
} from 'react-icons/hi';
import { useCampaign } from '@/context/CampaignContext';

interface CampaignDetailsData {
  title: string;
  description: string;
  requirements: string;
  qualityCriteria: string;
  expirationDate: string;
}

const CampaignDetails = () => {
  const { campaignData, updateCampaignDetails, errors } = useCampaign();
  const { details } = campaignData;

  // Split the requirements and quality criteria strings into arrays for bullet points
  const [requirementPoints, setRequirementPoints] = useState<string[]>(
    details.requirements
      ? details.requirements.split('|||').filter(Boolean)
      : ['']
  );
  const [qualityCriteriaPoints, setQualityCriteriaPoints] = useState<string[]>(
    details.qualityCriteria
      ? details.qualityCriteria.split('|||').filter(Boolean)
      : ['']
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name !== 'requirements' && name !== 'qualityCriteria') {
      updateCampaignDetails({ [name]: value });
    }
  };

  const handleBulletPointChange = (
    index: number,
    value: string,
    type: 'requirements' | 'qualityCriteria'
  ) => {
    if (type === 'requirements') {
      const newPoints = [...requirementPoints];
      newPoints[index] = value;
      setRequirementPoints(newPoints);
      updateCampaignDetails({
        requirements: newPoints.filter(Boolean).join('|||'),
      });
    } else {
      const newPoints = [...qualityCriteriaPoints];
      newPoints[index] = value;
      setQualityCriteriaPoints(newPoints);
      updateCampaignDetails({
        qualityCriteria: newPoints.filter(Boolean).join('|||'),
      });
    }
  };

  const addBulletPoint = (type: 'requirements' | 'qualityCriteria') => {
    if (type === 'requirements') {
      setRequirementPoints([...requirementPoints, '']);
    } else {
      setQualityCriteriaPoints([...qualityCriteriaPoints, '']);
    }
  };

  const removeBulletPoint = (
    index: number,
    type: 'requirements' | 'qualityCriteria'
  ) => {
    if (type === 'requirements') {
      const newPoints = requirementPoints.filter((_, i) => i !== index);
      setRequirementPoints(newPoints.length ? newPoints : ['']);
      updateCampaignDetails({
        requirements: newPoints.filter(Boolean).join('|||'),
      });
    } else {
      const newPoints = qualityCriteriaPoints.filter((_, i) => i !== index);
      setQualityCriteriaPoints(newPoints.length ? newPoints : ['']);
      updateCampaignDetails({
        qualityCriteria: newPoints.filter(Boolean).join('|||'),
      });
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-6">
      <form className="space-y-8 ml-24">
        {/* Title Input */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <HiOutlinePencil className="w-5 h-5 text-[#a855f7]" />
            <label
              htmlFor="title"
              className="block text-sm font-semibold text-[#f5f5faf4]"
            >
              Campaign Title
            </label>
          </div>
          <input
            type="text"
            id="title"
            name="title"
            value={details.title}
            onChange={handleChange}
            className={`w-full px-4 py-3 rounded-xl bg-[#f5f5fa14] border ${
              errors.details?.title ? 'border-red-500' : 'border-[#f5f5fa14]'
            } text-[#f5f5faf4] focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:border-transparent placeholder-[#f5f5fa4a] transition-all duration-200`}
            placeholder="Enter a descriptive title for your campaign"
          />
          {errors.details?.title && (
            <p className="text-red-500 text-sm mt-1">{errors.details.title}</p>
          )}
        </div>

        {/* Description Textarea */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <HiOutlineDocumentText className="w-5 h-5 text-[#a855f7]" />
            <label
              htmlFor="description"
              className="block text-sm font-semibold text-[#f5f5faf4]"
            >
              Description
            </label>
          </div>
          <textarea
            id="description"
            name="description"
            value={details.description}
            onChange={handleChange}
            rows={4}
            className={`w-full px-4 py-3 rounded-xl bg-[#f5f5fa14] border ${
              errors.details?.description
                ? 'border-red-500'
                : 'border-[#f5f5fa14]'
            } text-[#f5f5faf4] focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:border-transparent placeholder-[#f5f5fa4a] transition-all duration-200 resize-none`}
            placeholder="Provide a detailed description of what you're looking to collect"
          />
          {errors.details?.description && (
            <p className="text-red-500 text-sm mt-1">
              {errors.details.description}
            </p>
          )}
        </div>

        {/* Requirements Bullet Points */}
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <HiOutlineClipboardCheck className="w-5 h-5 text-[#a855f7]" />
              <label className="block text-sm font-semibold text-[#f5f5faf4]">
                Requirements
              </label>
            </div>
            <button
              type="button"
              onClick={() => addBulletPoint('requirements')}
              className="flex items-center gap-1 text-sm text-[#a855f7] hover:text-[#8e44dd] transition-colors"
            >
              <HiPlusCircle className="w-5 h-5" />
              Add Requirement
            </button>
          </div>
          <div className="space-y-3">
            {requirementPoints.map((point, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 w-2 h-2 rounded-full bg-[#a855f7]" />
                  <input
                    type="text"
                    value={point}
                    onChange={(e) =>
                      handleBulletPointChange(
                        index,
                        e.target.value,
                        'requirements'
                      )
                    }
                    className="w-full pl-8 pr-4 py-3 rounded-xl bg-[#f5f5fa14] border border-[#f5f5fa14] text-[#f5f5faf4] focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:border-transparent placeholder-[#f5f5fa4a] transition-all duration-200"
                    placeholder="Enter requirement"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeBulletPoint(index, 'requirements')}
                  className="text-[#f5f5fa4a] hover:text-red-500 transition-colors"
                >
                  <HiX className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
          {errors.details?.requirements && (
            <p className="text-red-500 text-sm mt-1">
              {errors.details.requirements}
            </p>
          )}
        </div>

        {/* Quality Criteria Bullet Points */}
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <HiOutlineClipboardCheck className="w-5 h-5 text-[#a855f7]" />
              <label className="block text-sm font-semibold text-[#f5f5faf4]">
                Quality Criteria
              </label>
            </div>
            <button
              type="button"
              onClick={() => addBulletPoint('qualityCriteria')}
              className="flex items-center gap-1 text-sm text-[#a855f7] hover:text-[#8e44dd] transition-colors"
            >
              <HiPlusCircle className="w-5 h-5" />
              Add Criteria
            </button>
          </div>
          <div className="space-y-3">
            {qualityCriteriaPoints.map((point, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 w-2 h-2 rounded-full bg-[#a855f7]" />
                  <input
                    type="text"
                    value={point}
                    onChange={(e) =>
                      handleBulletPointChange(
                        index,
                        e.target.value,
                        'qualityCriteria'
                      )
                    }
                    className="w-full pl-8 pr-4 py-3 rounded-xl bg-[#f5f5fa14] border border-[#f5f5fa14] text-[#f5f5faf4] focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:border-transparent placeholder-[#f5f5fa4a] transition-all duration-200"
                    placeholder="Enter quality criteria"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeBulletPoint(index, 'qualityCriteria')}
                  className="text-[#f5f5fa4a] hover:text-red-500 transition-colors"
                >
                  <HiX className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
          {errors.details?.qualityCriteria && (
            <p className="text-red-500 text-sm mt-1">
              {errors.details.qualityCriteria}
            </p>
          )}
        </div>

        {/* Expiration Date Input */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <HiOutlineCalendar className="w-5 h-5 text-[#a855f7]" />
            <label
              htmlFor="expirationDate"
              className="block text-sm font-semibold text-[#f5f5faf4]"
            >
              Expiration Date
            </label>
          </div>
          <input
            type="date"
            id="expirationDate"
            name="expirationDate"
            value={details.expirationDate}
            onChange={handleChange}
            min={new Date().toISOString().split('T')[0]}
            className={`w-full px-4 py-3 rounded-xl bg-[#f5f5fa14] border ${
              errors.details?.expirationDate
                ? 'border-red-500'
                : 'border-[#f5f5fa14]'
            } text-[#f5f5faf4] focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:border-transparent placeholder-[#f5f5fa4a] transition-all duration-200 [color-scheme:dark]`}
          />
          {errors.details?.expirationDate && (
            <p className="text-red-500 text-sm mt-1">
              {errors.details.expirationDate}
            </p>
          )}
        </div>
      </form>
    </div>
  );
};

export default CampaignDetails;
