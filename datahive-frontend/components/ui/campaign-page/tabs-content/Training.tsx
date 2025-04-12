import React, { useState, useEffect } from 'react';
import {
  HiOutlineChip,
  HiOutlineChartBar,
  HiOutlineDocumentText,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineInformationCircle,
  HiOutlineFilter,
  HiOutlineSearch,
} from 'react-icons/hi';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface ColumnInfo {
  name: string;
  type: 'numeric' | 'categorical' | 'text' | 'date' | 'boolean';
  description?: string;
  missing_values?: number;
  unique_values?: number;
  sample_values?: string[];
}

interface TrainingStatus {
  status: 'idle' | 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  result_url?: string;
  training_status_id?: string;
  started_at?: string;
  completed_at?: string;
}

interface TrainingProps {
  campaign: {
    campaign_id: string;
    onchain_campaign_id: string;
    title: string;
    data_requirements: string;
    current_contributions: number;
  };
  isLoading?: boolean;
}

const Training: React.FC<TrainingProps> = ({ campaign, isLoading }) => {
  const [targetColumn, setTargetColumn] = useState('');
  const [featureColumns, setFeatureColumns] = useState<string[]>([]);
  const [trainingType, setTrainingType] = useState<
    'classification' | 'regression'
  >('classification');
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>({
    status: 'idle',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showColumnInfo, setShowColumnInfo] = useState<string | null>(null);
  const [columnFilter, setColumnFilter] = useState<
    'all' | 'numeric' | 'categorical' | 'text' | 'date' | 'boolean'
  >('all');

  // Replace the useQuery for columns data with mock data
  const [columnsData, setColumnsData] = useState<{ columns: ColumnInfo[] }>({
    columns: [
      {
        name: 'age',
        type: 'numeric',
        unique_values: 30,
        missing_values: 0,
        sample_values: ['25', '30', '45', '60'],
      },
      {
        name: 'gender',
        type: 'categorical',
        unique_values: 2,
        missing_values: 0,
        sample_values: ['male', 'female'],
      },
      {
        name: 'income',
        type: 'numeric',
        unique_values: 100,
        missing_values: 5,
        sample_values: ['30000', '45000', '60000', '75000'],
      },
      {
        name: 'education',
        type: 'categorical',
        unique_values: 4,
        missing_values: 2,
        sample_values: ['high_school', 'bachelor', 'master', 'phd'],
      },
      {
        name: 'occupation',
        type: 'categorical',
        unique_values: 8,
        missing_values: 3,
        sample_values: ['engineer', 'doctor', 'teacher', 'artist'],
      },
      {
        name: 'has_purchased',
        type: 'boolean',
        unique_values: 2,
        missing_values: 0,
        sample_values: ['true', 'false'],
      },
    ],
  });
  const [isLoadingColumns, setIsLoadingColumns] = useState(false);

  // Load training status from localStorage on component mount
  useEffect(() => {
    const storedStatus = localStorage.getItem(
      `training_status_${campaign.onchain_campaign_id}`
    );
    if (storedStatus) {
      try {
        const parsedStatus = JSON.parse(storedStatus) as TrainingStatus;
        setTrainingStatus(parsedStatus);

        // If training was in progress, resume polling for updates
        if (
          parsedStatus.status === 'pending' ||
          parsedStatus.status === 'processing'
        ) {
          const statusId = parsedStatus.training_status_id;
          if (statusId) {
            const interval = startPollingForStatus(statusId);
            // Return cleanup function
            return () => {
              if (interval) clearInterval(interval);
            };
          }
        }
      } catch (e) {
        console.error('Error parsing stored training status:', e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign.onchain_campaign_id]); // Intentionally not including startPollingForStatus as dependency

  // Save training status to localStorage whenever it changes
  useEffect(() => {
    if (trainingStatus.status !== 'idle') {
      localStorage.setItem(
        `training_status_${campaign.onchain_campaign_id}`,
        JSON.stringify(trainingStatus)
      );
    }
  }, [trainingStatus, campaign.onchain_campaign_id]);

  // Function to start polling for status updates
  const startPollingForStatus = (training_status_id: string | undefined) => {
    if (!training_status_id) return;

    const statusCheckInterval = setInterval(async () => {
      try {
        const statusResponse = await axios.get(
          `/api/training/get-status?status_id=${training_status_id}`
        );

        if (statusResponse.data && statusResponse.data.success) {
          const backendStatus = statusResponse.data.status;

          console.log('Current training status:', backendStatus);

          if (backendStatus === 'completed') {
            clearInterval(statusCheckInterval);
            setTrainingStatus({
              status: 'completed',
              progress: 100,
              result_url: statusResponse.data.result_url,
              started_at: statusResponse.data.started_at,
              completed_at: statusResponse.data.completed_at,
              training_status_id,
            });
          } else if (backendStatus === 'failed') {
            clearInterval(statusCheckInterval);
            setTrainingStatus({
              status: 'failed',
              error: 'Training failed on the server',
              training_status_id,
            });
          } else if (backendStatus === 'processing') {
            // Update progress based on time elapsed
            setTrainingStatus((prev) => ({
              ...prev,
              progress: Math.min(prev.progress + 5, 90),
            }));
          }
        }
      } catch (error) {
        console.error('Error checking training status:', error);
      }
    }, 5000); // Check every 5 seconds

    return statusCheckInterval;
  };

  // Filter and search columns
  const filteredColumns: ColumnInfo[] =
    columnsData?.columns?.filter((column: ColumnInfo) => {
      const matchesSearch = column.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesFilter =
        columnFilter === 'all' || column.type === columnFilter;
      return matchesSearch && matchesFilter;
    }) || [];

  // Get recommended target columns based on training type
  const getRecommendedTargetColumns = () => {
    if (!columnsData?.columns) return [];

    return columnsData.columns.filter((column: ColumnInfo) => {
      if (trainingType === 'classification') {
        // For classification, prefer categorical columns with fewer unique values
        return column.type === 'categorical' && column.unique_values <= 10;
      } else {
        // For regression, prefer numeric columns
        return column.type === 'numeric';
      }
    });
  };

  const recommendedColumns = getRecommendedTargetColumns();

  // Reset target column when training type changes
  useEffect(() => {
    setTargetColumn('');
  }, [trainingType]);

  const handleStartTraining = async () => {
    try {
      setTrainingStatus({ status: 'pending', progress: 0 });

      console.log('Starting training with:', {
        on_chain_campaign_id: campaign.onchain_campaign_id,
        target_column: targetColumn,
        feature_columns: featureColumns,
        training_type: trainingType,
      });

      // Make API call to start training
      const response = await axios.post('/api/training/start-training', {
        on_chain_campaign_id: campaign.onchain_campaign_id,
        target_column: targetColumn,
        feature_columns: featureColumns,
        training_type: trainingType,
      });

      if (response.data && response.data.success) {
        console.log('Training initiated successfully:', response.data);

        const training_status_id = response.data.training_status_id;

        // Update training status with the ID
        setTrainingStatus((prev) => ({
          ...prev,
          status: 'processing',
          progress: 10,
          training_status_id,
        }));

        // Start polling for status updates
        const statusCheckInterval = startPollingForStatus(training_status_id);

        // Clean up interval if component unmounts
        return () => {
          if (statusCheckInterval) clearInterval(statusCheckInterval);
        };
      } else {
        throw new Error(response.data?.error || 'Failed to start training');
      }
    } catch (error) {
      console.error('Training error:', error);
      setTrainingStatus({
        status: 'failed',
        error:
          error instanceof Error
            ? error.message
            : 'Failed to start training. Please try again.',
      });
    }
  };

  // Add a clear training status function
  const handleClearTrainingStatus = () => {
    localStorage.removeItem(`training_status_${campaign.onchain_campaign_id}`);
    setTrainingStatus({ status: 'idle' });
  };

  // Generate mock columns based on campaign details and requirements
  useEffect(() => {
    if (campaign && campaign.data_requirements) {
      try {
        const requirements = campaign.data_requirements
          .split('|||')
          .filter(Boolean);
        const generatedColumns: ColumnInfo[] = [];

        // Create potential target columns for classification/regression
        if (
          campaign.title.toLowerCase().includes('sentiment') ||
          requirements.some((req) => req.toLowerCase().includes('sentiment'))
        ) {
          generatedColumns.push({
            name: 'sentiment',
            type: 'categorical',
            unique_values: 3,
            missing_values: 0,
            sample_values: ['positive', 'neutral', 'negative'],
          });
        }

        if (
          campaign.title.toLowerCase().includes('purchase') ||
          requirements.some((req) => req.toLowerCase().includes('purchase'))
        ) {
          generatedColumns.push({
            name: 'has_purchased',
            type: 'boolean',
            unique_values: 2,
            missing_values: 0,
            sample_values: ['true', 'false'],
          });
        }

        if (
          campaign.title.toLowerCase().includes('class') ||
          requirements.some(
            (req) =>
              req.toLowerCase().includes('class') ||
              req.toLowerCase().includes('category')
          )
        ) {
          generatedColumns.push({
            name: 'category',
            type: 'categorical',
            unique_values: 5,
            missing_values: 2,
            sample_values: ['A', 'B', 'C', 'D', 'E'],
          });
        }

        // Create potential feature columns based on requirement keywords
        if (
          requirements.some(
            (req) =>
              req.toLowerCase().includes('demographic') ||
              req.toLowerCase().includes('age') ||
              req.toLowerCase().includes('personal')
          )
        ) {
          generatedColumns.push({
            name: 'age',
            type: 'numeric',
            unique_values: 60,
            missing_values: 3,
            sample_values: ['25', '32', '47', '65'],
          });

          generatedColumns.push({
            name: 'gender',
            type: 'categorical',
            unique_values: 2,
            missing_values: 1,
            sample_values: ['male', 'female'],
          });

          generatedColumns.push({
            name: 'location',
            type: 'categorical',
            unique_values: 15,
            missing_values: 2,
            sample_values: ['New York', 'California', 'Texas', 'Florida'],
          });
        }

        if (
          requirements.some(
            (req) =>
              req.toLowerCase().includes('financial') ||
              req.toLowerCase().includes('income') ||
              req.toLowerCase().includes('economic')
          )
        ) {
          generatedColumns.push({
            name: 'income',
            type: 'numeric',
            unique_values: 100,
            missing_values: 8,
            sample_values: ['42000', '65000', '85000', '120000'],
          });

          generatedColumns.push({
            name: 'credit_score',
            type: 'numeric',
            unique_values: 300,
            missing_values: 15,
            sample_values: ['580', '650', '720', '780'],
          });
        }

        if (
          requirements.some(
            (req) =>
              req.toLowerCase().includes('product') ||
              req.toLowerCase().includes('purchase') ||
              req.toLowerCase().includes('transaction')
          )
        ) {
          generatedColumns.push({
            name: 'purchase_amount',
            type: 'numeric',
            unique_values: 120,
            missing_values: 0,
            sample_values: ['49.99', '99.99', '149.99', '299.99'],
          });

          generatedColumns.push({
            name: 'product_id',
            type: 'categorical',
            unique_values: 50,
            missing_values: 0,
            sample_values: ['P1001', 'P1002', 'P1003', 'P1004'],
          });

          generatedColumns.push({
            name: 'purchase_date',
            type: 'date',
            unique_values: 90,
            missing_values: 0,
            sample_values: [
              '2023-01-15',
              '2023-02-20',
              '2023-03-10',
              '2023-04-05',
            ],
          });
        }

        if (
          requirements.some(
            (req) =>
              req.toLowerCase().includes('social') ||
              req.toLowerCase().includes('behavior') ||
              req.toLowerCase().includes('activity')
          )
        ) {
          generatedColumns.push({
            name: 'login_frequency',
            type: 'numeric',
            unique_values: 30,
            missing_values: 0,
            sample_values: ['1', '3', '7', '14'],
          });

          generatedColumns.push({
            name: 'active_hours',
            type: 'numeric',
            unique_values: 24,
            missing_values: 5,
            sample_values: ['2.5', '4.1', '6.0', '8.5'],
          });
        }

        // Ensure we have at least some default columns if nothing matched
        if (generatedColumns.length < 3) {
          generatedColumns.push(
            {
              name: 'age',
              type: 'numeric',
              unique_values: 30,
              missing_values: 0,
              sample_values: ['25', '30', '45', '60'],
            },
            {
              name: 'gender',
              type: 'categorical',
              unique_values: 2,
              missing_values: 0,
              sample_values: ['male', 'female'],
            },
            {
              name: 'income',
              type: 'numeric',
              unique_values: 100,
              missing_values: 5,
              sample_values: ['30000', '45000', '60000', '75000'],
            }
          );
        }

        // Add some generated text fields
        generatedColumns.push({
          name: 'comments',
          type: 'text',
          unique_values: campaign.current_contributions,
          missing_values: Math.floor(campaign.current_contributions * 0.1),
          sample_values: [
            'Very satisfied with the service',
            'Could be improved',
            'Excellent experience',
            'Will recommend to others',
          ],
        });

        // Set the columns data
        setColumnsData({ columns: generatedColumns });
      } catch (error) {
        console.error(
          'Error generating columns from campaign requirements:',
          error
        );
        // Fallback to default columns if there's an error
        setColumnsData({
          columns: [
            {
              name: 'age',
              type: 'numeric',
              unique_values: 30,
              missing_values: 0,
              sample_values: ['25', '30', '45', '60'],
            },
            {
              name: 'gender',
              type: 'categorical',
              unique_values: 2,
              missing_values: 0,
              sample_values: ['male', 'female'],
            },
            {
              name: 'income',
              type: 'numeric',
              unique_values: 100,
              missing_values: 5,
              sample_values: ['30000', '45000', '60000', '75000'],
            },
          ],
        });
      }
    }
  }, [campaign]);

  if (isLoading || isLoadingColumns) {
    return (
      <div className="space-y-6 py-6 pr-6">
        <div className="grid grid-cols-3 gap-6">
          {[...Array(3)].map((_, index) => (
            <div
              key={index}
              className="rounded-xl p-6 border border-[#f5f5fa14] animate-pulse"
            >
              <div className="h-8 w-8 bg-[#f5f5fa14] rounded-lg mb-4"></div>
              <div className="h-4 w-24 bg-[#f5f5fa14] rounded mb-2"></div>
              <div className="h-6 w-16 bg-[#f5f5fa14] rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6 pr-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-6">
        <div className="rounded-xl p-6 border border-[#f5f5fa14]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#6366f1] to-[#a855f7] flex items-center justify-center">
              <HiOutlineDocumentText className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[#f5f5fa7a] text-sm">Total Data Points</p>
              <p className="text-[#f5f5faf4] text-xl font-semibold">
                {campaign.current_contributions}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl p-6 border border-[#f5f5fa14]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#6366f1] to-[#a855f7] flex items-center justify-center">
              <HiOutlineChartBar className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[#f5f5fa7a] text-sm">Available Features</p>
              <p className="text-[#f5f5faf4] text-xl font-semibold">
                {columnsData?.columns?.length || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl p-6 border border-[#f5f5fa14]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#6366f1] to-[#a855f7] flex items-center justify-center">
              <HiOutlineChip className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[#f5f5fa7a] text-sm">Training Type</p>
              <p className="text-[#f5f5faf4] text-xl font-semibold capitalize">
                {trainingType}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Training Configuration */}
      <div className="rounded-xl p-6 border border-[#f5f5fa14]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#f5f5faf4] text-lg font-semibold">
            Training Configuration
          </h3>
          <div className="flex items-center gap-2 text-[#f5f5fa7a] text-sm">
            <HiOutlineInformationCircle className="w-4 h-4 text-[#6366f1]" />
            <span>Only CSV campaigns are eligible for AI training</span>
          </div>
        </div>

        <div className="space-y-6">
          {/* Training Type Selection */}
          <div>
            <label className="text-[#f5f5fa7a] text-sm mb-2 block">
              Training Type
            </label>
            <div className="flex gap-4">
              <button
                onClick={() => setTrainingType('classification')}
                className={`px-4 py-2 rounded-lg ${
                  trainingType === 'classification'
                    ? 'bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white'
                    : 'bg-[#f5f5fa14] text-[#f5f5fa7a] hover:bg-[#f5f5fa1a]'
                }`}
              >
                Classification
              </button>
              <button
                onClick={() => setTrainingType('regression')}
                className={`px-4 py-2 rounded-lg ${
                  trainingType === 'regression'
                    ? 'bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white'
                    : 'bg-[#f5f5fa14] text-[#f5f5fa7a] hover:bg-[#f5f5fa1a]'
                }`}
              >
                Regression
              </button>
            </div>
          </div>

          {/* Column Selection Header */}
          <div className="flex items-center justify-between">
            <h4 className="text-[#f5f5faf4] text-base font-medium">
              Column Selection
            </h4>
            <div className="flex items-center gap-4">
              {/* Search Input */}
              <div className="relative">
                <HiOutlineSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#f5f5fa7a] w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search columns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-[#f5f5fa14] border border-[#f5f5fa1a] rounded-lg text-[#f5f5faf4] focus:outline-none focus:ring-2 focus:ring-[#6366f1]"
                />
              </div>

              {/* Column Type Filter */}
              <div className="relative">
                <select
                  value={columnFilter}
                  onChange={(e) => setColumnFilter(e.target.value as any)}
                  className="appearance-none pl-9 pr-8 py-2 bg-[#f5f5fa14] border border-[#f5f5fa1a] rounded-lg text-[#f5f5faf4] focus:outline-none focus:ring-2 focus:ring-[#6366f1]"
                >
                  <option value="all">All Types</option>
                  <option value="numeric">Numeric</option>
                  <option value="categorical">Categorical</option>
                  <option value="text">Text</option>
                  <option value="date">Date</option>
                  <option value="boolean">Boolean</option>
                </select>
                <HiOutlineFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#f5f5fa7a] w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Target Column Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[#f5f5fa7a] text-sm">Target Column</label>
              <span className="text-[#f5f5fa7a] text-xs">
                {trainingType === 'classification'
                  ? 'Select a categorical column with 2-10 unique values'
                  : 'Select a numeric column for prediction'}
              </span>
            </div>

            <div className="space-y-4">
              {/* Recommended Columns Section */}
              {recommendedColumns.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[#f5f5fa7a] text-xs">
                    Recommended Columns:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {recommendedColumns.map((column: ColumnInfo) => (
                      <button
                        key={column.name}
                        onClick={() => setTargetColumn(column.name)}
                        className={`p-2 rounded-lg text-sm text-left ${
                          targetColumn === column.name
                            ? 'bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white'
                            : 'bg-[#f5f5fa14] text-[#f5f5faf4] hover:bg-[#f5f5fa1a]'
                        }`}
                      >
                        <div className="font-medium">{column.name}</div>
                        <div className="text-xs opacity-75">
                          {column.unique_values} unique values
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* All Columns Dropdown */}
              <div>
                <select
                  value={targetColumn}
                  onChange={(e) => setTargetColumn(e.target.value)}
                  className="w-full bg-[#f5f5fa14] border border-[#f5f5fa1a] rounded-lg px-4 py-2 text-[#f5f5faf4] focus:outline-none focus:ring-2 focus:ring-[#6366f1]"
                >
                  <option value="">Select target column</option>
                  {filteredColumns?.map((column: ColumnInfo) => (
                    <option key={column.name} value={column.name}>
                      {column.name} ({column.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Column Type Warning */}
              {targetColumn &&
                !recommendedColumns.some(
                  (col) => col.name === targetColumn
                ) && (
                  <div className="flex items-center gap-2 text-yellow-500 text-sm">
                    <HiOutlineExclamationCircle className="w-4 h-4" />
                    <span>
                      {trainingType === 'classification'
                        ? 'This column might not be ideal for classification. Consider using a categorical column with fewer unique values.'
                        : 'This column might not be ideal for regression. Consider using a numeric column.'}
                    </span>
                  </div>
                )}
            </div>
          </div>

          {/* Feature Columns Selection */}
          <div>
            <label className="text-[#f5f5fa7a] text-sm mb-2 block">
              Feature Columns
            </label>
            <div className="grid grid-cols-3 gap-4">
              {filteredColumns
                ?.filter((col) => col.name !== targetColumn) // Don't show target column in features
                .map((column: ColumnInfo) => (
                  <div key={column.name} className="relative">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={column.name}
                        checked={featureColumns.includes(column.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFeatureColumns([...featureColumns, column.name]);
                          } else {
                            setFeatureColumns(
                              featureColumns.filter(
                                (col) => col !== column.name
                              )
                            );
                          }
                        }}
                        className="w-4 h-4 rounded border-[#f5f5fa1a] bg-[#f5f5fa14] text-[#6366f1] focus:ring-[#6366f1]"
                      />
                      <label
                        htmlFor={column.name}
                        className="text-[#f5f5faf4] text-sm flex items-center gap-1"
                      >
                        {column.name}
                        <button
                          onClick={() =>
                            setShowColumnInfo(
                              showColumnInfo === column.name
                                ? null
                                : column.name
                            )
                          }
                          className="text-[#f5f5fa7a] hover:text-[#f5f5faf4]"
                        >
                          <HiOutlineInformationCircle className="w-4 h-4" />
                        </button>
                      </label>
                    </div>

                    {/* Column Info Tooltip */}
                    {showColumnInfo === column.name && (
                      <div className="absolute z-10 mt-2 p-4 bg-[#1a1a1a] border border-[#f5f5fa14] rounded-lg shadow-lg w-64">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[#f5f5fa7a] text-sm">
                              Type:
                            </span>
                            <span className="text-[#f5f5faf4] text-sm capitalize">
                              {column.type}
                            </span>
                          </div>
                          {column.missing_values !== undefined && (
                            <div className="flex items-center justify-between">
                              <span className="text-[#f5f5fa7a] text-sm">
                                Missing Values:
                              </span>
                              <span className="text-[#f5f5faf4] text-sm">
                                {column.missing_values}
                              </span>
                            </div>
                          )}
                          {column.unique_values !== undefined && (
                            <div className="flex items-center justify-between">
                              <span className="text-[#f5f5fa7a] text-sm">
                                Unique Values:
                              </span>
                              <span className="text-[#f5f5faf4] text-sm">
                                {column.unique_values}
                              </span>
                            </div>
                          )}
                          {column.sample_values &&
                            column.sample_values.length > 0 && (
                              <div>
                                <span className="text-[#f5f5fa7a] text-sm block mb-1">
                                  Sample Values:
                                </span>
                                <div className="space-y-1">
                                  {column.sample_values
                                    .slice(0, 3)
                                    .map((value, index) => (
                                      <div
                                        key={index}
                                        className="text-[#f5f5faf4] text-sm truncate"
                                      >
                                        {value}
                                      </div>
                                    ))}
                                  {column.sample_values.length > 3 && (
                                    <div className="text-[#f5f5fa7a] text-sm">
                                      +{column.sample_values.length - 3} more
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* Start Training Button */}
          <button
            onClick={handleStartTraining}
            disabled={
              !targetColumn ||
              featureColumns.length === 0 ||
              trainingStatus.status === 'pending' ||
              trainingStatus.status === 'processing'
            }
            className={`w-full py-3 rounded-lg text-white font-medium ${
              !targetColumn || featureColumns.length === 0
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-[#6366f1] to-[#a855f7] hover:opacity-90'
            }`}
          >
            {trainingStatus.status === 'pending' ||
            trainingStatus.status === 'processing' ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Training in Progress...
              </div>
            ) : (
              'Start Training'
            )}
          </button>
        </div>
      </div>

      {/* Training Status */}
      {trainingStatus.status !== 'idle' && (
        <div className="rounded-xl p-6 border border-[#f5f5fa14]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[#f5f5faf4] text-lg font-semibold">
              Training Status
            </h3>
            <button
              onClick={handleClearTrainingStatus}
              className="text-[#f5f5fa7a] hover:text-[#f5f5faf4] text-sm"
            >
              Clear Status
            </button>
          </div>

          {(trainingStatus.status === 'pending' ||
            trainingStatus.status === 'processing') && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[#f5f5fa7a]">
                <div className="w-4 h-4 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin"></div>
                {trainingStatus.status === 'pending'
                  ? 'Initializing training...'
                  : 'Training in progress...'}
              </div>
              <div className="w-full bg-[#f5f5fa14] rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-[#6366f1] to-[#a855f7] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${trainingStatus.progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {trainingStatus.status === 'completed' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-500">
                <HiOutlineCheckCircle className="w-5 h-5" />
                Training completed successfully!
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg p-4 bg-[#f5f5fa14]">
                  <p className="text-[#f5f5fa7a] text-sm">Training ID</p>
                  <p className="text-[#f5f5faf4] font-medium truncate">
                    {trainingStatus.training_status_id}
                  </p>
                </div>
                <div className="rounded-lg p-4 bg-[#f5f5fa14]">
                  <p className="text-[#f5f5fa7a] text-sm">Completed At</p>
                  <p className="text-[#f5f5faf4] font-medium">
                    {trainingStatus.completed_at
                      ? new Date(trainingStatus.completed_at).toLocaleString()
                      : 'N/A'}
                  </p>
                </div>
              </div>
              {trainingStatus.result_url && (
                <div className="mt-4">
                  <a
                    href={trainingStatus.result_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-gradient-to-r from-[#6366f1] to-[#a855f7] rounded-lg text-white flex items-center justify-center gap-2 hover:opacity-90"
                  >
                    <HiOutlineDocumentText className="w-5 h-5" />
                    View Training Results
                  </a>
                </div>
              )}
            </div>
          )}

          {trainingStatus.status === 'failed' && (
            <div className="flex items-center gap-2 text-red-500">
              <HiOutlineExclamationCircle className="w-5 h-5" />
              {trainingStatus.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Training;
