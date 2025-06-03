import { useState } from "react";
import { DollarSign, TrendingUp, Users, Globe, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import toast from "react-hot-toast";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";

// Define the form validation schema with zod
const investorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  organization: z.string().min(2, "Organization must be at least 2 characters"),
  investmentFocus: z.string().min(1, "Investment focus is required"),
  investmentRange: z.string().min(1, "Investment range is required"),
  message: z.string().optional(),
});

type InvestorFormData = z.infer<typeof investorSchema>;

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function RegistrationModal({ isOpen, onClose }: RegistrationModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<InvestorFormData>({
    resolver: zodResolver(investorSchema)
  });
  
  const onSubmit = (data: InvestorFormData) => {
    // Simulate API call delay
    setTimeout(() => {
      // Show success message
      toast.success("Your registration has been submitted successfully!");
      // Reset the form
      reset();
      // Close the modal
      onClose();
    }, 1000);
  };
  
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-background-black bg-opacity-90" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-background-light dark:bg-background-black p-8 text-left align-middle shadow-xl transition-all">
                <div className="flex justify-between mb-8">
                  <Dialog.Title
                    as="h3"
                    className="text-3xl font-bold text-text-dark dark:text-text-light"
                  >
                    Join Our Investors
                  </Dialog.Title>
                  <button
                    type="button"
                    className="rounded-full bg-neutral-light/20 dark:bg-neutral-dark/20 p-2 text-text-dark dark:text-text-light hover:bg-neutral-light/30 dark:hover:bg-neutral-dark/30"
                    onClick={onClose}
                  >
                    <X size={24} />
                  </button>
                </div>
                
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div>
                    <label
                      htmlFor="name"
                      className="mb-2 block text-sm font-medium text-text-dark dark:text-text-light"
                    >
                      Your Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      {...register("name")}
                      className="w-full rounded-md border-0 bg-neutral-light/20 dark:bg-neutral-dark/20 px-4 py-3 text-text-dark dark:text-text-light placeholder-text-dark/40 dark:placeholder-text-light/40 focus:ring-2 focus:ring-secondary"
                      placeholder="Enter your full name"
                    />
                    {errors.name && (
                      <p className="mt-2 text-sm text-secondary">{errors.name.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-sm font-medium text-text-dark dark:text-text-light"
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      {...register("email")}
                      className="w-full rounded-md border-0 bg-neutral-light/20 dark:bg-neutral-dark/20 px-4 py-3 text-text-dark dark:text-text-light placeholder-text-dark/40 dark:placeholder-text-light/40 focus:ring-2 focus:ring-secondary"
                      placeholder="Enter your email address"
                    />
                    {errors.email && (
                      <p className="mt-2 text-sm text-secondary">{errors.email.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label
                      htmlFor="organization"
                      className="mb-2 block text-sm font-medium text-text-dark dark:text-text-light"
                    >
                      Organization
                    </label>
                    <input
                      type="text"
                      id="organization"
                      {...register("organization")}
                      className="w-full rounded-md border-0 bg-neutral-light/20 dark:bg-neutral-dark/20 px-4 py-3 text-text-dark dark:text-text-light placeholder-text-dark/40 dark:placeholder-text-light/40 focus:ring-2 focus:ring-secondary"
                      placeholder="Enter your organization name"
                    />
                    {errors.organization && (
                      <p className="mt-2 text-sm text-secondary">{errors.organization.message}</p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="investmentFocus"
                        className="mb-2 block text-sm font-medium text-text-dark dark:text-text-light"
                      >
                        Investment Focus
                      </label>
                      <select
                        id="investmentFocus"
                        {...register("investmentFocus")}
                        className="w-full rounded-md border-0 bg-neutral-light/20 dark:bg-neutral-dark/20 px-4 py-3 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary"
                      >
                        <option value="">Select focus</option>
                        <option value="climate">Climate Resilience</option>
                        <option value="digital">Digital Infrastructure</option>
                        <option value="health">Healthcare</option>
                        <option value="energy">Clean Energy</option>
                        <option value="multiple">Multiple Sectors</option>
                      </select>
                      {errors.investmentFocus && (
                        <p className="mt-2 text-sm text-secondary">{errors.investmentFocus.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <label
                        htmlFor="investmentRange"
                        className="mb-2 block text-sm font-medium text-text-dark dark:text-text-light"
                      >
                        Investment Range
                      </label>
                      <select
                        id="investmentRange"
                        {...register("investmentRange")}
                        className="w-full rounded-md border-0 bg-neutral-light/20 dark:bg-neutral-dark/20 px-4 py-3 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary"
                      >
                        <option value="">Select range</option>
                        <option value="seed">$10K - $100K</option>
                        <option value="early">$100K - $500K</option>
                        <option value="growth">$500K - $2M</option>
                        <option value="scale">$2M+</option>
                      </select>
                      {errors.investmentRange && (
                        <p className="mt-2 text-sm text-secondary">{errors.investmentRange.message}</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label
                      htmlFor="message"
                      className="mb-2 block text-sm font-medium text-text-dark dark:text-text-light"
                    >
                      Message (Optional)
                    </label>
                    <textarea
                      id="message"
                      rows={3}
                      {...register("message")}
                      className="w-full rounded-md border-0 bg-neutral-light/20 dark:bg-neutral-dark/20 px-4 py-3 text-text-dark dark:text-text-light placeholder-text-dark/40 dark:placeholder-text-light/40 focus:ring-2 focus:ring-secondary"
                      placeholder="Tell us about your investment interests"
                    ></textarea>
                  </div>
                  
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full rounded-full bg-secondary px-8 py-4 text-base font-medium text-white transition-all hover:bg-secondary-light disabled:opacity-70"
                    >
                      {isSubmitting ? "Submitting..." : "Join Our Investor Network"}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

export default function InvestorEngagementSection() {
  const [investmentAmount, setInvestmentAmount] = useState(100000);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const calculateImpact = (amount: number) => {
    // These are simplified calculations for demonstration purposes
    const financialReturn = amount * 0.15; // 15% ROI
    const peopleImpacted = Math.floor(amount / 10); // $10 per person impacted
    const countriesReached = Math.floor(Math.log2(amount / 10000)); // Logarithmic scale
    
    return {
      financialReturn,
      peopleImpacted,
      countriesReached,
    };
  };
  
  const impact = calculateImpact(investmentAmount);
  
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInvestmentAmount(Number(e.target.value));
  };
  
  // Open the registration modal
  const openModal = () => {
    setIsModalOpen(true);
  };
  
  // Close the registration modal
  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <section
      id="invest"
      className="section-padding relative overflow-hidden bg-background-light dark:bg-background-black"
    >
      <div className="mx-auto max-w-7xl container-padding">
        <div className="mb-16 max-w-3xl">
          <h2 className="mb-8 text-5xl font-extrabold leading-tight text-text-dark dark:text-text-light md:text-6xl">
            Investor Impact
          </h2>
          <p className="text-xl font-light text-text-dark/80 dark:text-text-light/80 md:text-2xl">
            Join our network of impact investors funding solutions to global challenges with both financial and social returns.
          </p>
        </div>
        
        <div className="grid grid-cols-1 gap-24 lg:grid-cols-2">
          {/* Left column: Quote */}
          <div>
            <div className="mb-6 text-sm font-semibold uppercase tracking-widest text-secondary">
              Investor Perspective
            </div>
            <div className="mb-8">
              <p className="mb-8 text-3xl font-light italic leading-relaxed text-text-dark dark:text-text-light md:text-4xl">
                "Investing in Quantum Alliance means backing real solutions that scale globally while generating strong returns."
              </p>
              <div className="flex items-center">
                <div className="mr-4 h-12 w-12 rounded-full bg-secondary"></div>
                <div>
                  <p className="text-lg font-bold text-text-dark dark:text-text-light">Jane Smith</p>
                  <p className="text-base text-text-dark/70 dark:text-text-light/70">Managing Partner, Global Impact Fund</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right column: Impact Calculator */}
          <div>
            <div className="mb-6 text-sm font-semibold uppercase tracking-widest text-secondary">
              Impact Calculator
            </div>
            <div className="rounded-lg bg-neutral-light/20 dark:bg-neutral-dark/20 p-8">
              <h3 className="mb-8 text-2xl font-bold text-text-dark dark:text-text-light">
                Calculate Your Impact
              </h3>
              
              <div className="mb-8">
                <div className="mb-2 flex justify-between">
                  <label 
                    htmlFor="investment-amount" 
                    className="text-sm font-medium text-text-dark dark:text-text-light"
                  >
                    Investment Amount
                  </label>
                  <span className="text-lg font-bold text-secondary">
                    ${investmentAmount.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  id="investment-amount"
                  min="10000"
                  max="1000000"
                  step="10000"
                  value={investmentAmount}
                  onChange={handleSliderChange}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-neutral-light dark:bg-neutral-dark"
                />
                <div className="mt-2 flex justify-between text-xs text-text-dark/60 dark:text-text-light/60">
                  <span>$10,000</span>
                  <span>$1,000,000</span>
                </div>
              </div>
              
              <div className="mb-8 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="mr-3 rounded-full bg-secondary/20 p-2">
                      <TrendingUp size={20} className="text-secondary" />
                    </div>
                    <span className="text-text-dark dark:text-text-light">Estimated Return</span>
                  </div>
                  <span className="text-xl font-bold text-secondary">
                    ${impact.financialReturn.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="mr-3 rounded-full bg-secondary/20 p-2">
                      <Users size={20} className="text-secondary" />
                    </div>
                    <span className="text-text-dark dark:text-text-light">People Impacted</span>
                  </div>
                  <span className="text-xl font-bold text-secondary">
                    {impact.peopleImpacted.toLocaleString()}+
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="mr-3 rounded-full bg-secondary/20 p-2">
                      <Globe size={20} className="text-secondary" />
                    </div>
                    <span className="text-text-dark dark:text-text-light">Countries Reached</span>
                  </div>
                  <span className="text-xl font-bold text-secondary">
                    {impact.countriesReached}+
                  </span>
                </div>
              </div>
              
              <button 
                onClick={openModal}
                className="w-full rounded-full bg-secondary px-8 py-4 text-base font-medium text-white transition-all hover:bg-secondary-light"
              >
                Join the Investor Network
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Registration Modal */}
      <RegistrationModal isOpen={isModalOpen} onClose={closeModal} />
    </section>
  );
}
