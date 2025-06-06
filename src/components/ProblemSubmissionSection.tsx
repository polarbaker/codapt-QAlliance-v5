import { useState, useEffect } from "react";
import { ArrowRight, ArrowLeft, Check, ChevronRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import toast from "react-hot-toast";
import { useTRPC } from "~/trpc/react";
import { useMutation } from "@tanstack/react-query";

// Define the form validation schema with zod
const problemSchema = z.object({
  // Step 1: Challenge Details
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  category: z.string().min(1, "Category is required"),
  
  // Step 2: Requirements
  technicalRequirements: z.string().min(20, "Technical requirements must be at least 20 characters"),
  constraints: z.string().min(5, "Constraints must be at least 5 characters"),
  
  // Step 3: Success Criteria
  successCriteria: z.string().min(20, "Success criteria must be at least 20 characters"),
  timeline: z.string().min(1, "Timeline is required"),
  budget: z.string().min(1, "Budget is required"),
  
  // Step 4: Contact Information
  name: z.string().min(2, "Name must be at least 2 characters"),
  organization: z.string().min(2, "Organization must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(5, "Phone number must be at least 5 characters"),
  consentToContact: z.boolean().refine(val => val === true, {
    message: "You must agree to be contacted for follow-up"
  }),
});

// Type for our form data
type ProblemFormData = z.infer<typeof problemSchema>;

interface StepIndicatorProps {
  number: number;
  title: string;
  isActive: boolean;
  isCompleted: boolean;
  onClick: () => void;
}

function StepIndicator({ number, title, isActive, isCompleted, onClick }: StepIndicatorProps) {
  return (
    <button
      className={`flex items-center py-4 transition-all focus:outline-none ${
        isActive ? "opacity-100" : "opacity-60 hover:opacity-80"
      }`}
      onClick={onClick}
      aria-label={`Go to step ${number}: ${title}`}
      aria-current={isActive ? "step" : undefined}
      aria-disabled={!isActive && !isCompleted}
      type="button"
    >
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full mr-3 ${
          isCompleted 
            ? "bg-secondary" 
            : isActive 
            ? "border-2 border-secondary text-secondary" 
            : "border border-text-light/20 text-text-light/40"
        }`}
      >
        {isCompleted ? (
          <Check size={16} className="text-white" />
        ) : (
          <span className={isActive ? "text-secondary" : "text-text-light/40"}>{number}</span>
        )}
      </div>
      <span className={`text-sm font-medium ${isActive ? "text-text-dark dark:text-text-light" : "text-text-dark/60 dark:text-text-light/60"}`}>
        {title}
      </span>
      {!isActive && !isCompleted && (
        <ChevronRight size={16} className="ml-auto text-text-dark/40 dark:text-text-light/40" />
      )}
      {isCompleted && !isActive && (
        <Check size={16} className="ml-auto text-secondary" />
      )}
      {isActive && (
        <div className="ml-auto h-1 w-16 bg-secondary"></div>
      )}
    </button>
  );
}

// Helper function to create form labels with required indicator
const FormLabel = ({ htmlFor, required = true, children }: { htmlFor: string; required?: boolean; children: React.ReactNode }) => (
  <label
    htmlFor={htmlFor}
    className="mb-2 block text-sm font-medium text-text-dark dark:text-text-light"
  >
    {children}
    {required && <span className="ml-1 text-secondary" aria-hidden="true">*</span>}
  </label>
);

// Helper function to create form helper text
const HelperText = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-1 text-xs text-text-dark/60 dark:text-text-light/60">
    {children}
  </p>
);

interface ProblemSubmissionSectionProps {
  id?: string;
}

export default function ProblemSubmissionSection({ id }: ProblemSubmissionSectionProps) {
  // All hooks must be called at the top level
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [submissionComplete, setSubmissionComplete] = useState(false);
  
  const trpc = useTRPC();

  // Use react-hook-form with zod validation
  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<ProblemFormData>({
    resolver: zodResolver(problemSchema),
    mode: "onBlur",
  });

  // Use the tRPC mutation for submitting the problem
  const submitProblemMutation = useMutation(
    trpc.submitProblem.mutationOptions({
      onSuccess: () => {
        toast.success("Your challenge has been submitted successfully!");
        setSubmissionComplete(true);
      },
      onError: (error) => {
        toast.error(`Submission failed: ${error.message}`);
      },
    })
  );

  const totalSteps = 4;
  
  const steps = [
    { 
      number: 1, 
      title: "Challenge Details", 
      fields: ["title", "description", "category"] 
    },
    { 
      number: 2, 
      title: "Requirements", 
      fields: ["technicalRequirements", "constraints"] 
    },
    { 
      number: 3, 
      title: "Success Criteria", 
      fields: ["successCriteria", "timeline", "budget"] 
    },
    { 
      number: 4, 
      title: "Contact Information", 
      fields: ["name", "organization", "email", "phone", "consentToContact"] 
    },
  ];

  // Handle moving to the next step
  const handleNextStep = async () => {
    // Validate the current step fields
    const currentStepFields = steps[currentStep - 1].fields as (keyof ProblemFormData)[];
    const isStepValid = await trigger(currentStepFields);
    
    if (!isStepValid) {
      // Show error toast if validation fails
      toast.error("Please fix the errors before proceeding");
      return;
    }

    if (currentStep < totalSteps) {
      // Move to next step if current step is valid
      setCompletedSteps([...completedSteps, currentStep]);
      setCurrentStep(currentStep + 1);
    } else {
      // Submit the form if on the last step
      handleSubmit(onSubmit)();
    }
  };

  // Handle moving to the previous step
  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Button labels for different steps
  const getNextButtonLabel = () => {
    if (isSubmitting || submitProblemMutation.isPending) {
      return "Processing...";
    }
    if (currentStep < totalSteps) {
      return "Next Step";
    }
    return "Review & Submit";
  };

  // Handle step click (navigation between steps)
  const handleStepClick = (stepNumber: number) => {
    // Only allow clicking on completed steps or the next available step
    if (completedSteps.includes(stepNumber - 1) || stepNumber === 1 || completedSteps.includes(stepNumber)) {
      setCurrentStep(stepNumber);
    }
  };

  // Form submission handler
  const onSubmit = (data: ProblemFormData) => {
    // Mark the last step as completed
    setCompletedSteps([...completedSteps, currentStep]);
    
    // Submit the data to the server
    submitProblemMutation.mutate(data);
  };

  return (
    <section
      id={id}
      className="section-padding relative overflow-hidden bg-background-light dark:bg-background-black"
    >
      <div className="mx-auto max-w-7xl container-padding">
        {submissionComplete ? (
          // Success state
          <div className="mx-auto max-w-3xl rounded-lg bg-white p-12 md:p-16 text-center shadow-xl dark:bg-neutral-dark/20 border border-secondary/20">
            <div className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-full bg-secondary text-white shadow-lg">
              <Check size={40} />
            </div>
            <h3 className="mb-6 text-3xl font-bold text-text-dark dark:text-text-light">Challenge Submitted Successfully!</h3>
            <p className="mb-6 text-lg text-text-dark/80 dark:text-text-light/80">
              Thank you for submitting your challenge. Our team will review your submission and get back to you within 3-5 business days.
            </p>
            <div className="mb-12 p-4 bg-secondary/10 rounded-lg text-md text-text-dark/70 dark:text-text-light/70">
              <p>
                Your challenge has been recorded in our database and will be reviewed by our innovation team.
                If you have any questions in the meantime, please contact <a href="mailto:challenges@quantumalliance.org" className="text-secondary hover:underline font-medium">challenges@quantumalliance.org</a>.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => {
                  setSubmissionComplete(false);
                  setCurrentStep(1);
                  setCompletedSteps([]);
                }}
                className="inline-block rounded-full bg-secondary px-8 py-4 text-lg font-medium text-white transition-all hover:bg-secondary-light hover:scale-105"
              >
                Submit Another Challenge
              </button>
              <a 
                href="/challenges" 
                className="inline-block rounded-full border-2 border-secondary px-8 py-4 text-lg font-medium text-secondary transition-all hover:bg-secondary/10"
              >
                View Current Challenges
              </a>
            </div>
          </div>
        ) : (
          // Form state
          <div className="grid grid-cols-1 gap-8 md:gap-16 lg:grid-cols-3">
            {/* Left column: Step navigation */}
            <div className="lg:border-r lg:border-text-dark/10 lg:dark:border-text-light/10 lg:pr-8">
              <div className="sticky top-24">
                <div className="mb-8 text-sm font-semibold uppercase tracking-widest text-secondary">
                  Submission Process
                </div>
                <div className="space-y-1 divide-y divide-text-dark/10 dark:divide-text-light/10">
                  {steps.map((step) => (
                    <StepIndicator
                      key={step.number}
                      number={step.number}
                      title={step.title}
                      isActive={currentStep === step.number}
                      isCompleted={completedSteps.includes(step.number)}
                      onClick={() => handleStepClick(step.number)}
                    />
                  ))}
                </div>
                
                <div className="mt-8 p-4 bg-secondary/10 rounded-lg">
                  <p className="text-sm text-text-dark/80 dark:text-text-light/80">
                    Your information is secure. We'll only use it to follow up on your challenge submission.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Right column: Form fields */}
            <div className="lg:col-span-2">
              <form className="space-y-8">
                {currentStep === 1 && (
                  <div className="space-y-8">
                    <h2 className="text-2xl font-bold text-text-dark dark:text-text-light mb-6">Challenge Details</h2>
                    <div>
                      <FormLabel htmlFor="title">
                        Challenge Title
                      </FormLabel>
                      <input
                        type="text"
                        id="title"
                        {...register("title")}
                        className="w-full rounded-md border-0 bg-neutral-light/20 dark:bg-neutral-dark/20 px-4 py-3 text-text-dark dark:text-text-light placeholder-text-dark/40 dark:placeholder-text-light/40 focus:ring-2 focus:ring-secondary"
                        placeholder="Enter a short, descriptive title for your challenge"
                      />
                      <HelperText>
                        A clear, concise title that describes your challenge (1-2 sentences)
                      </HelperText>
                      {errors.title && (
                        <p className="mt-2 text-sm text-secondary flex items-center">
                          <span className="mr-1">⚠️</span> {errors.title.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <FormLabel htmlFor="category">
                        Category
                      </FormLabel>
                      <select
                        id="category"
                        {...register("category")}
                        className="w-full rounded-md border-0 bg-neutral-light/20 dark:bg-neutral-dark/20 px-4 py-3 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary"
                      >
                        <option value="">Select a category</option>
                        <option value="Climate">Climate</option>
                        <option value="Health">Health</option>
                        <option value="Infrastructure">Infrastructure</option>
                        <option value="AI">AI</option>
                        <option value="Energy">Energy</option>
                        <option value="Education">Education</option>
                        <option value="Agriculture">Agriculture</option>
                        <option value="Other">Other</option>
                      </select>
                      <HelperText>
                        Choose the category that best fits your challenge
                      </HelperText>
                      {errors.category && (
                        <p className="mt-2 text-sm text-secondary flex items-center">
                          <span className="mr-1">⚠️</span> {errors.category.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <FormLabel htmlFor="description">
                        Challenge Description
                      </FormLabel>
                      <textarea
                        id="description"
                        rows={5}
                        {...register("description")}
                        className="w-full rounded-md border-0 bg-neutral-light/20 dark:bg-neutral-dark/20 px-4 py-3 text-text-dark dark:text-text-light placeholder-text-dark/40 dark:placeholder-text-light/40 focus:ring-2 focus:ring-secondary"
                        placeholder="Provide a detailed description of the challenge, including background and why it matters"
                      ></textarea>
                      <HelperText>
                        A comprehensive description of the challenge, its background, and why it's important to solve
                      </HelperText>
                      {errors.description && (
                        <p className="mt-2 text-sm text-secondary flex items-center">
                          <span className="mr-1">⚠️</span> {errors.description.message}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-8">
                    <h2 className="text-2xl font-bold text-text-dark dark:text-text-light mb-6">Requirements</h2>
                    <div>
                      <FormLabel htmlFor="technicalRequirements">
                        Technical Requirements
                      </FormLabel>
                      <textarea
                        id="technicalRequirements"
                        rows={5}
                        {...register("technicalRequirements")}
                        className="w-full rounded-md border-0 bg-neutral-light/20 dark:bg-neutral-dark/20 px-4 py-3 text-text-dark dark:text-text-light placeholder-text-dark/40 dark:placeholder-text-light/40 focus:ring-2 focus:ring-secondary"
                        placeholder="Describe the technical requirements, specifications, or capabilities needed for the solution"
                      ></textarea>
                      <HelperText>
                        Detail the technical specifications, platforms, integrations, or capabilities required
                      </HelperText>
                      {errors.technicalRequirements && (
                        <p className="mt-2 text-sm text-secondary flex items-center">
                          <span className="mr-1">⚠️</span> {errors.technicalRequirements.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <FormLabel htmlFor="constraints">
                        Constraints & Limitations
                      </FormLabel>
                      <textarea
                        id="constraints"
                        rows={4}
                        {...register("constraints")}
                        className="w-full rounded-md border-0 bg-neutral-light/20 dark:bg-neutral-dark/20 px-4 py-3 text-text-dark dark:text-text-light placeholder-text-dark/40 dark:placeholder-text-light/40 focus:ring-2 focus:ring-secondary"
                        placeholder="List any constraints, limitations, or requirements that solutions must consider"
                      ></textarea>
                      <HelperText>
                        Include regulatory, budget, time, technical, or other constraints that solutions must work within
                      </HelperText>
                      {errors.constraints && (
                        <p className="mt-2 text-sm text-secondary flex items-center">
                          <span className="mr-1">⚠️</span> {errors.constraints.message}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-8">
                    <h2 className="text-2xl font-bold text-text-dark dark:text-text-light mb-6">Success Criteria</h2>
                    <div>
                      <FormLabel htmlFor="successCriteria">
                        Success Criteria
                      </FormLabel>
                      <textarea
                        id="successCriteria"
                        rows={5}
                        {...register("successCriteria")}
                        className="w-full rounded-md border-0 bg-neutral-light/20 dark:bg-neutral-dark/20 px-4 py-3 text-text-dark dark:text-text-light placeholder-text-dark/40 dark:placeholder-text-light/40 focus:ring-2 focus:ring-secondary"
                        placeholder="Describe how you would measure success for this challenge"
                      ></textarea>
                      <HelperText>
                        Define the outcomes, metrics, KPIs, or impacts that would indicate a successful solution
                      </HelperText>
                      {errors.successCriteria && (
                        <p className="mt-2 text-sm text-secondary flex items-center">
                          <span className="mr-1">⚠️</span> {errors.successCriteria.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <FormLabel htmlFor="timeline">
                        Desired Timeline
                      </FormLabel>
                      <select
                        id="timeline"
                        {...register("timeline")}
                        className="w-full rounded-md border-0 bg-neutral-light/20 dark:bg-neutral-dark/20 px-4 py-3 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary"
                      >
                        <option value="">Select a timeline</option>
                        <option value="Immediate (0-3 months)">Immediate (0-3 months)</option>
                        <option value="Short-term (3-6 months)">Short-term (3-6 months)</option>
                        <option value="Medium-term (6-12 months)">Medium-term (6-12 months)</option>
                        <option value="Long-term (1-2 years)">Long-term (1-2 years)</option>
                        <option value="Extended (2+ years)">Extended (2+ years)</option>
                      </select>
                      <HelperText>
                        When would you like to see the solution implemented and making an impact?
                      </HelperText>
                      {errors.timeline && (
                        <p className="mt-2 text-sm text-secondary flex items-center">
                          <span className="mr-1">⚠️</span> {errors.timeline.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <FormLabel htmlFor="budget">
                        Budget Range
                      </FormLabel>
                      <select
                        id="budget"
                        {...register("budget")}
                        className="w-full rounded-md border-0 bg-neutral-light/20 dark:bg-neutral-dark/20 px-4 py-3 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary"
                      >
                        <option value="">Select budget range</option>
                        <option value="Under $10,000">Under $10,000</option>
                        <option value="$10,000 - $50,000">$10,000 - $50,000</option>
                        <option value="$50,000 - $100,000">$50,000 - $100,000</option>
                        <option value="$100,000 - $500,000">$100,000 - $500,000</option>
                        <option value="$500,000 - $1,000,000">$500,000 - $1,000,000</option>
                        <option value="Over $1,000,000">Over $1,000,000</option>
                        <option value="To be determined">To be determined</option>
                      </select>
                      <HelperText>
                        What budget range are you considering for this challenge?
                      </HelperText>
                      {errors.budget && (
                        <p className="mt-2 text-sm text-secondary flex items-center">
                          <span className="mr-1">⚠️</span> {errors.budget.message}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="space-y-8">
                    <h2 className="text-2xl font-bold text-text-dark dark:text-text-light mb-6">Contact Information</h2>
                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                      <div>
                        <FormLabel htmlFor="name">
                          Full Name
                        </FormLabel>
                        <input
                          type="text"
                          id="name"
                          {...register("name")}
                          className="w-full rounded-md border-0 bg-neutral-light/20 dark:bg-neutral-dark/20 px-4 py-3 text-text-dark dark:text-text-light placeholder-text-dark/40 dark:placeholder-text-light/40 focus:ring-2 focus:ring-secondary"
                          placeholder="Enter your full name"
                        />
                        <HelperText>
                          Your full name as the primary contact
                        </HelperText>
                        {errors.name && (
                          <p className="mt-2 text-sm text-secondary flex items-center">
                            <span className="mr-1">⚠️</span> {errors.name.message}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <FormLabel htmlFor="organization">
                          Organization
                        </FormLabel>
                        <input
                          type="text"
                          id="organization"
                          {...register("organization")}
                          className="w-full rounded-md border-0 bg-neutral-light/20 dark:bg-neutral-dark/20 px-4 py-3 text-text-dark dark:text-text-light placeholder-text-dark/40 dark:placeholder-text-light/40 focus:ring-2 focus:ring-secondary"
                          placeholder="Enter your organization name"
                        />
                        <HelperText>
                          Company, institution, or organization you represent
                        </HelperText>
                        {errors.organization && (
                          <p className="mt-2 text-sm text-secondary flex items-center">
                            <span className="mr-1">⚠️</span> {errors.organization.message}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                      <div>
                        <FormLabel htmlFor="email">
                          Contact Email
                        </FormLabel>
                        <input
                          type="email"
                          id="email"
                          {...register("email")}
                          className="w-full rounded-md border-0 bg-neutral-light/20 dark:bg-neutral-dark/20 px-4 py-3 text-text-dark dark:text-text-light placeholder-text-dark/40 dark:placeholder-text-light/40 focus:ring-2 focus:ring-secondary"
                          placeholder="Enter your email address"
                        />
                        <HelperText>
                          Your primary email for communications about this challenge
                        </HelperText>
                        {errors.email && (
                          <p className="mt-2 text-sm text-secondary flex items-center">
                            <span className="mr-1">⚠️</span> {errors.email.message}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <FormLabel htmlFor="phone">
                          Phone Number
                        </FormLabel>
                        <input
                          type="tel"
                          id="phone"
                          {...register("phone")}
                          className="w-full rounded-md border-0 bg-neutral-light/20 dark:bg-neutral-dark/20 px-4 py-3 text-text-dark dark:text-text-light placeholder-text-dark/40 dark:placeholder-text-light/40 focus:ring-2 focus:ring-secondary"
                          placeholder="Enter your phone number"
                        />
                        <HelperText>
                          Your phone number for direct contact if needed
                        </HelperText>
                        {errors.phone && (
                          <p className="mt-2 text-sm text-secondary flex items-center">
                            <span className="mr-1">⚠️</span> {errors.phone.message}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <div className="flex items-start">
                        <div className="flex h-5 items-center">
                          <input
                            id="consentToContact"
                            type="checkbox"
                            {...register("consentToContact")}
                            className="h-4 w-4 rounded border-gray-300 text-secondary focus:ring-secondary"
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label htmlFor="consentToContact" className="font-medium text-text-dark dark:text-text-light">
                            I agree to be contacted for follow-up <span className="text-secondary">*</span>
                          </label>
                          <p className="text-text-dark/60 dark:text-text-light/60">
                            We'll only use your contact information to follow up about this challenge submission.
                          </p>
                        </div>
                      </div>
                      {errors.consentToContact && (
                        <p className="mt-2 text-sm text-secondary flex items-center">
                          <span className="mr-1">⚠️</span> {errors.consentToContact.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="rounded-lg bg-neutral-light/20 dark:bg-neutral-dark/20 p-4">
                      <p className="text-sm text-text-dark/70 dark:text-text-light/70">
                        By submitting this challenge, you agree to our <a href="#" onClick={(e) => {
                          e.preventDefault(); 
                          toast.info("Terms of Service coming soon! Our legal team is finalizing the document to ensure clarity and compliance.");
                        }} className="text-secondary hover-line">Terms of Service</a> and <a href="#" onClick={(e) => {
                          e.preventDefault(); 
                          toast.info("Privacy Policy coming soon! We're committed to transparency about how we handle your data.");
                        }} className="text-secondary hover-line">Privacy Policy</a>.
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Navigation buttons */}
                <div className="flex justify-between pt-8">
                  {currentStep > 1 ? (
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="inline-flex items-center rounded-full border-2 border-secondary px-8 py-4 text-lg font-medium text-secondary transition-all hover:bg-secondary/10"
                      aria-label="Go back to previous step"
                    >
                      <ArrowLeft size={20} className="mr-2" /> Back
                    </button>
                  ) : (
                    <div>{/* Empty div to maintain flex layout */}</div>
                  )}
                  
                  <button
                    type="button"
                    onClick={handleNextStep}
                    disabled={isSubmitting || submitProblemMutation.isPending}
                    className="inline-flex items-center rounded-full bg-secondary px-8 py-4 text-lg font-medium text-white transition-all hover:bg-secondary-light hover:scale-105 disabled:opacity-70"
                    aria-label={currentStep < totalSteps ? "Proceed to next step" : "Submit your challenge"}
                  >
                    {getNextButtonLabel()}
                    {currentStep < totalSteps && <ArrowRight size={20} className="ml-2" />}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
