// import React, { Fragment, useState, useEffect } from 'react';
// import { Dialog, Transition } from '@headlessui/react';
// import {
//   HiX,
//   HiCurrencyDollar,
//   HiCheck,
//   HiMinus,
//   HiPlus,
//   HiSparkles,
//   HiOutlineShieldCheck,
// } from 'react-icons/hi';
// import { Switch } from '@headlessui/react';
// import { useWallet } from '@aptos-labs/wallet-adapter-react';
// import { toast } from 'react-toastify';
// import {
//   createSubscription,
//   createSubscriptionWithDelegation,
// } from '@/utils/entry-functions/subscription';
// import { useSubscription } from '@/context/SubscriptionContext';

// interface SubscriptionModalProps {
//   isOpen: boolean;
//   onClose: () => void;
// }

// const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
//   isOpen,
//   onClose,
// }) => {
//   const [autoRenew, setAutoRenew] = useState(true);
//   const [delegatedAmount, setDelegatedAmount] = useState(2);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [isSuccess, setIsSuccess] = useState(false);
//   const [txHash, setTxHash] = useState<string | null>(null);
//   const { account, signAndSubmitTransaction } = useWallet();
//   const { refreshSubscription, isSubscribed } = useSubscription();

//   // Reset modal state when it opens
//   useEffect(() => {
//     if (isOpen) {
//       resetModal();
//     }
//   }, [isOpen]);

//   const handleDelegatedAmountChange = (change: 'increase' | 'decrease') => {
//     if (change === 'increase') {
//       setDelegatedAmount((prev) => Math.min(prev + 2, 100));
//     } else {
//       setDelegatedAmount((prev) => Math.max(prev - 2, 2));
//     }
//   };

//   const resetModal = () => {
//     setIsSuccess(false);
//     setTxHash(null);
//     setIsSubmitting(false);
//   };

//   const handleClose = async () => {
//     // If subscription was successful, ensure we refresh the status before closing
//     if (isSuccess) {
//       try {
//         // Force a refresh of subscription status
//         await refreshSubscription();
//         console.log('Subscription refreshed on modal close');
//       } catch (error) {
//         console.error('Error refreshing subscription on modal close:', error);
//       } finally {
//         resetModal();
//         onClose();
//       }
//     } else {
//       resetModal();
//       onClose();
//     }
//   };

//   const handleSubscribe = async () => {
//     if (!account) {
//       toast.error('Please connect your wallet first');
//       return;
//     }

//     setIsSubmitting(true);
//     try {
//       let payload;

//       // Choose between regular subscription and subscription with delegation based on autoRenew
//       if (autoRenew) {
//         // If auto-renewal is enabled, use createSubscriptionWithDelegation
//         payload = createSubscriptionWithDelegation({
//           subscriptionType: 'premium',
//           autoRenew,
//           delegationAmount: delegatedAmount,
//         });
//       } else {
//         // If auto-renewal is disabled, use regular createSubscription
//         payload = createSubscription({
//           subscriptionType: 'premium',
//           autoRenew,
//         });
//       }

//       const response = await signAndSubmitTransaction({
//         sender: account.address,
//         data: payload.data,
//         options: {
//           maxGasAmount: 200000,
//           gasUnitPrice: 1000,
//         },
//       });

//       console.log('Transaction hash:', response.hash);
//       setTxHash(response.hash);
//       setIsSuccess(true);

//       // Wait for transaction to be processed
//       await new Promise((resolve) => setTimeout(resolve, 3000));

//       // Refresh subscription status after successful transaction
//       // This will update the global subscription context
//       try {
//         await refreshSubscription();
//         console.log('Subscription refreshed after transaction');
//       } catch (refreshError) {
//         console.error(
//           'Error refreshing subscription after transaction:',
//           refreshError
//         );
//         // Try one more time after a delay
//         setTimeout(async () => {
//           try {
//             await refreshSubscription();
//             console.log('Subscription refreshed after retry');
//           } catch (retryError) {
//             console.error(
//               'Error refreshing subscription after retry:',
//               retryError
//             );
//           }
//         }, 2000);
//       }

//       toast.success('Subscription created successfully!');
//     } catch (error: any) {
//       console.error('Error creating subscription:', error);
//       toast.error(`Failed to create subscription: ${error.message}`);
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   // Success view component
//   const SuccessView = () => (
//     <div className="text-center space-y-6">
//       <div className="relative">
//         <div className="absolute inset-0 flex items-center justify-center">
//           <div className="w-24 h-24 rounded-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] opacity-20 animate-pulse"></div>
//         </div>
//         <div className="relative flex justify-center">
//           <div className="w-20 h-20 rounded-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] flex items-center justify-center">
//             <HiSparkles className="h-10 w-10 text-white" />
//           </div>
//         </div>
//       </div>

//       <h2 className="text-2xl font-bold text-white">
//         Welcome to Hyvve Premium!
//       </h2>

//       <p className="text-[#f5f5fa7a]">
//         Your subscription has been successfully activated. Enjoy all the premium
//         features!
//       </p>

//       {txHash && (
//         <div className="bg-[#f5f5fa0a] rounded-xl p-4 mt-4">
//           <p className="text-sm text-[#f5f5fa7a] mb-1">Transaction Hash</p>
//           <p className="font-mono text-xs text-[#f5f5faf4] truncate">
//             {txHash}
//           </p>
//           <a
//             href={`https://explorer.movementlabs.xyz/txn/${txHash}?network=bardock+testnet`}
//             target="_blank"
//             rel="noopener noreferrer"
//             className="text-xs text-[#a855f7] hover:text-[#6366f1] transition-colors mt-2 inline-block"
//           >
//             View on Explorer →
//           </a>
//         </div>
//       )}

//       <div className="space-y-3 mt-4">
//         <div className="flex items-center p-3 bg-[#f5f5fa0a] rounded-lg">
//           <HiOutlineShieldCheck className="h-5 w-5 text-[#22c55e] mr-3" />
//           <div className="text-left">
//             <h3 className="text-sm font-medium text-white">Premium Support</h3>
//             <p className="text-xs text-[#f5f5fa7a]">
//               Priority access to our support team
//             </p>
//           </div>
//         </div>

//         <div className="flex items-center p-3 bg-[#f5f5fa0a] rounded-lg">
//           <HiCheck className="h-5 w-5 text-[#22c55e] mr-3" />
//           <div className="text-left">
//             <h3 className="text-sm font-medium text-white">
//               Advanced Features
//             </h3>
//             <p className="text-xs text-[#f5f5fa7a]">
//               Access to all premium features
//             </p>
//           </div>
//         </div>

//         <div className="flex items-center p-3 bg-[#f5f5fa0a] rounded-lg">
//           <HiCheck className="h-5 w-5 text-[#22c55e] mr-3" />
//           <div className="text-left">
//             <h3 className="text-sm font-medium text-white">
//               Auto-Renewal {autoRenew ? 'Enabled' : 'Disabled'}
//             </h3>
//             <p className="text-xs text-[#f5f5fa7a]">
//               {autoRenew
//                 ? `Your subscription will auto-renew with ${delegatedAmount} MOVE delegated`
//                 : 'You will need to manually renew your subscription'}
//             </p>
//           </div>
//         </div>
//       </div>

//       <button
//         onClick={handleClose}
//         className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white font-semibold hover:opacity-90 transition-opacity"
//       >
//         Continue to Hyvve
//       </button>
//     </div>
//   );

//   return (
//     <Transition show={isOpen} as={Fragment}>
//       <Dialog
//         as="div"
//         className="fixed inset-0 z-50 overflow-y-auto"
//         onClose={handleClose}
//       >
//         <Transition.Child
//           as={Fragment}
//           enter="ease-out duration-300"
//           enterFrom="opacity-0"
//           enterTo="opacity-100"
//           leave="ease-in duration-200"
//           leaveFrom="opacity-100"
//           leaveTo="opacity-0"
//         >
//           <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
//         </Transition.Child>

//         <div className="fixed inset-0 flex items-center justify-center p-4">
//           <Transition.Child
//             as={Fragment}
//             enter="ease-out duration-300"
//             enterFrom="opacity-0 scale-95"
//             enterTo="opacity-100 scale-100"
//             leave="ease-in duration-200"
//             leaveFrom="opacity-100 scale-100"
//             leaveTo="opacity-0 scale-95"
//           >
//             <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-[#0f0f17] p-6 shadow-xl transition-all border border-[#f5f5fa14]">
//               {!isSuccess ? (
//                 <>
//                   <button
//                     onClick={handleClose}
//                     className="absolute right-4 top-4 text-[#f5f5fa7a] hover:text-white transition-colors"
//                   >
//                     <HiX className="h-6 w-6" />
//                   </button>

//                   <Dialog.Title className="text-2xl font-bold text-white mb-2">
//                     {isSubscribed
//                       ? 'Manage Your Subscription'
//                       : 'Upgrade to Hyvve Premium'}
//                   </Dialog.Title>
//                   <Dialog.Description className="text-[#f5f5fa7a] text-sm mb-6">
//                     {isSubscribed
//                       ? 'Your subscription is currently active. You can manage your settings below.'
//                       : 'Unlock premium features and support the Hyvve ecosystem'}
//                   </Dialog.Description>

//                   <div className="bg-[#f5f5fa0a] rounded-xl p-4 mb-6">
//                     <div className="flex justify-between items-center mb-4">
//                       <span className="text-[#f5f5faf4] font-medium">
//                         Monthly Subscription
//                       </span>
//                       <div className="flex items-center">
//                         <HiCurrencyDollar className="h-5 w-5 text-[#a855f7]" />
//                         <span className="text-lg font-bold text-white">
//                           2 MOVE
//                         </span>
//                       </div>
//                     </div>
//                     <p className="text-[#f5f5fa7a] text-sm">
//                       Your subscription will be automatically deducted every
//                       month
//                     </p>
//                   </div>

//                   <div className="space-y-4 mb-6">
//                     <div className="flex items-center justify-between p-4 border border-[#f5f5fa14] rounded-xl">
//                       <div className="space-y-1">
//                         <h3 className="text-[#f5f5faf4] font-medium">
//                           Auto-renewal
//                         </h3>
//                         <p className="text-[#f5f5fa7a] text-sm">
//                           Keep your premium benefits active
//                         </p>
//                       </div>
//                       <Switch
//                         checked={autoRenew}
//                         onChange={setAutoRenew}
//                         className={`${
//                           autoRenew ? 'bg-[#a855f7]' : 'bg-[#f5f5fa14]'
//                         } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:ring-offset-2 focus:ring-offset-[#0f0f17]`}
//                       >
//                         <span className="sr-only">Enable auto-renewal</span>
//                         <span
//                           className={`${
//                             autoRenew ? 'translate-x-6' : 'translate-x-1'
//                           } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
//                         />
//                       </Switch>
//                     </div>

//                     {/* Delegated Funds Input - Only shown when autoRenew is true */}
//                     <Transition
//                       show={autoRenew}
//                       enter="transition ease-out duration-200"
//                       enterFrom="opacity-0 translate-y-1"
//                       enterTo="opacity-100 translate-y-0"
//                       leave="transition ease-in duration-150"
//                       leaveFrom="opacity-100 translate-y-0"
//                       leaveTo="opacity-0 translate-y-1"
//                     >
//                       <div className="p-4 border border-[#f5f5fa14] rounded-xl bg-[#f5f5fa0a]">
//                         <div className="space-y-1 mb-3">
//                           <h3 className="text-[#f5f5faf4] font-medium">
//                             Delegated Funds
//                           </h3>
//                           <p className="text-[#f5f5fa7a] text-sm">
//                             Choose amount in multiples of 2 MOVE
//                           </p>
//                         </div>
//                         <div className="flex items-center justify-between">
//                           <button
//                             onClick={() =>
//                               handleDelegatedAmountChange('decrease')
//                             }
//                             className="p-2 rounded-lg bg-[#f5f5fa14] text-[#f5f5faf4] hover:bg-[#f5f5fa1a] transition-colors"
//                             disabled={delegatedAmount <= 2}
//                           >
//                             <HiMinus className="h-5 w-5" />
//                           </button>
//                           <div className="flex items-center">
//                             <HiCurrencyDollar className="h-5 w-5 text-[#a855f7]" />
//                             <span className="text-lg font-bold text-white">
//                               {delegatedAmount} MOVE
//                             </span>
//                           </div>
//                           <button
//                             onClick={() =>
//                               handleDelegatedAmountChange('increase')
//                             }
//                             className="p-2 rounded-lg bg-[#f5f5fa14] text-[#f5f5faf4] hover:bg-[#f5f5fa1a] transition-colors"
//                           >
//                             <HiPlus className="h-5 w-5" />
//                           </button>
//                         </div>
//                       </div>
//                     </Transition>
//                   </div>

//                   <button
//                     onClick={handleSubscribe}
//                     disabled={isSubmitting}
//                     className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white font-semibold hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:ring-offset-2 focus:ring-offset-[#0f0f17] disabled:opacity-50 disabled:cursor-not-allowed"
//                   >
//                     {isSubmitting
//                       ? 'Processing...'
//                       : isSubscribed
//                       ? 'Update Subscription'
//                       : 'Subscribe Now'}
//                   </button>

//                   <p className="mt-4 text-center text-xs text-[#f5f5fa7a]">
//                     By subscribing, you agree to the terms of Hyvve Premium
//                     membership
//                   </p>
//                 </>
//               ) : (
//                 <SuccessView />
//               )}
//             </Dialog.Panel>
//           </Transition.Child>
//         </div>
//       </Dialog>
//     </Transition>
//   );
// };

// export default SubscriptionModal;
