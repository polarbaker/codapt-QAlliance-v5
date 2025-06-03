import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import toast from "react-hot-toast";
import { api } from "~/trpc/react";
import { Mail, Send, ArrowRight, MessageSquare, Users, Globe } from "lucide-react";

// Define the newsletter form validation schema
const newsletterSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// Define the contact form validation schema
const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

// Type for our form data
type NewsletterFormData = z.infer<typeof newsletterSchema>;
type ContactFormData = z.infer<typeof contactSchema>;

function NewsletterSubscriptionForm() {
  const {
    register: registerNewsletter,
    handleSubmit: handleNewsletterSubmit,
    reset: resetNewsletter,
    formState: { errors: newsletterErrors },
  } = useForm<NewsletterFormData>({
    resolver: zodResolver(newsletterSchema),
  });

  const subscribeNewsletterMutation = api.subscribeNewsletter.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      resetNewsletter();
    },
    onError: (error) => {
      toast.error(`Subscription failed: ${error.message}`);
    },
  });

  const onSubmitNewsletter = (data: NewsletterFormData) => {
    subscribeNewsletterMutation.mutate(data);
  };

  return (
    <div className="rounded-lg bg-neutral-light/20 dark:bg-neutral-dark/20 p-8">
      <div className="mb-6 flex items-center">
        <div className="mr-4 rounded-full bg-secondary/20 p-3">
          <Mail size={24} className="text-secondary" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-text-dark dark:text-text-light">
            Subscribe to Our Newsletter
          </h3>
          <p className="text-text-dark/70 dark:text-text-light/70">
            Stay updated with the latest challenges and innovations
          </p>
        </div>
      </div>

      <form onSubmit={handleNewsletterSubmit(onSubmitNewsletter)} className="space-y-4">
        <div>
          <label
            htmlFor="newsletter-email"
            className="mb-2 block text-sm font-medium text-text-dark dark:text-text-light"
          >
            Email Address
          </label>
          <div className="flex">
            <input
              type="email"
              id="newsletter-email"
              {...registerNewsletter("email")}
              className="w-full rounded-l-md border-0 bg-neutral-light/20 dark:bg-neutral-dark/20 px-4 py-3 text-text-dark dark:text-text-light placeholder-text-dark/40 dark:placeholder-text-light/40 focus:ring-2 focus:ring-secondary"
              placeholder="your.email@example.com"
            />
            <button
              type="submit"
              disabled={subscribeNewsletterMutation.isPending}
              className="rounded-r-md bg-secondary px-5 py-3 text-white transition-colors hover:bg-secondary-light disabled:opacity-70"
              aria-label="Subscribe to newsletter"
            >
              {subscribeNewsletterMutation.isPending ? (
                "Subscribing..."
              ) : (
                <ArrowRight size={20} />
              )}
            </button>
          </div>
          {newsletterErrors.email && (
            <p className="mt-2 text-sm text-secondary">{newsletterErrors.email.message}</p>
          )}
        </div>

        <p className="text-sm text-text-dark/60 dark:text-text-light/60">
          We respect your privacy. You can unsubscribe at any time.
        </p>
      </form>
    </div>
  );
}

function ContactForm() {
  const {
    register: registerContact,
    handleSubmit: handleContactSubmit,
    reset: resetContact,
    formState: { errors: contactErrors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const submitContactMutation = api.submitContactMessage.useMutation({
    onSuccess: () => {
      toast.success("Your message has been sent successfully! We'll get back to you soon.");
      resetContact();
    },
    onError: (error) => {
      toast.error(`Message submission failed: ${error.message}`);
    },
  });

  const onSubmitContact = (data: ContactFormData) => {
    submitContactMutation.mutate(data);
  };

  return (
    <div className="rounded-lg bg-neutral-light/20 dark:bg-neutral-dark/20 p-8">
      <div className="mb-6 flex items-center">
        <div className="mr-4 rounded-full bg-secondary/20 p-3">
          <MessageSquare size={24} className="text-secondary" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-text-dark dark:text-text-light">
            Send Us a Message
          </h3>
          <p className="text-text-dark/70 dark:text-text-light/70">
            Questions, partnerships, or feedback? We'd love to hear from you.
          </p>
        </div>
      </div>

      <form onSubmit={handleContactSubmit(onSubmitContact)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label
              htmlFor="contact-name"
              className="mb-2 block text-sm font-medium text-text-dark dark:text-text-light"
            >
              Your Name
            </label>
            <input
              type="text"
              id="contact-name"
              {...registerContact("name")}
              className="w-full rounded-md border-0 bg-neutral-light/20 dark:bg-neutral-dark/20 px-4 py-3 text-text-dark dark:text-text-light placeholder-text-dark/40 dark:placeholder-text-light/40 focus:ring-2 focus:ring-secondary"
              placeholder="John Doe"
            />
            {contactErrors.name && (
              <p className="mt-2 text-sm text-secondary">{contactErrors.name.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="contact-email"
              className="mb-2 block text-sm font-medium text-text-dark dark:text-text-light"
            >
              Email Address
            </label>
            <input
              type="email"
              id="contact-email"
              {...registerContact("email")}
              className="w-full rounded-md border-0 bg-neutral-light/20 dark:bg-neutral-dark/20 px-4 py-3 text-text-dark dark:text-text-light placeholder-text-dark/40 dark:placeholder-text-light/40 focus:ring-2 focus:ring-secondary"
              placeholder="your.email@example.com"
            />
            {contactErrors.email && (
              <p className="mt-2 text-sm text-secondary">{contactErrors.email.message}</p>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="contact-subject"
            className="mb-2 block text-sm font-medium text-text-dark dark:text-text-light"
          >
            Subject
          </label>
          <input
            type="text"
            id="contact-subject"
            {...registerContact("subject")}
            className="w-full rounded-md border-0 bg-neutral-light/20 dark:bg-neutral-dark/20 px-4 py-3 text-text-dark dark:text-text-light placeholder-text-dark/40 dark:placeholder-text-light/40 focus:ring-2 focus:ring-secondary"
            placeholder="Partnership Opportunity"
          />
          {contactErrors.subject && (
            <p className="mt-2 text-sm text-secondary">{contactErrors.subject.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="contact-message"
            className="mb-2 block text-sm font-medium text-text-dark dark:text-text-light"
          >
            Message
          </label>
          <textarea
            id="contact-message"
            rows={5}
            {...registerContact("message")}
            className="w-full rounded-md border-0 bg-neutral-light/20 dark:bg-neutral-dark/20 px-4 py-3 text-text-dark dark:text-text-light placeholder-text-dark/40 dark:placeholder-text-light/40 focus:ring-2 focus:ring-secondary"
            placeholder="Tell us about your inquiry or message..."
          ></textarea>
          {contactErrors.message && (
            <p className="mt-2 text-sm text-secondary">{contactErrors.message.message}</p>
          )}
        </div>

        <div>
          <button
            type="submit"
            disabled={submitContactMutation.isPending}
            className="inline-flex w-full items-center justify-center rounded-full bg-secondary px-8 py-4 text-base font-medium text-white transition-all hover:bg-secondary-light disabled:opacity-70"
          >
            {submitContactMutation.isPending ? (
              "Sending..."
            ) : (
              <>
                Send Message
                <Send size={20} className="ml-2" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function JoinUsSection() {
  return (
    <section
      id="join-us"
      className="section-padding relative overflow-hidden bg-background-light dark:bg-background-black"
    >
      <div className="mx-auto max-w-7xl container-padding">
        <div className="mb-16 max-w-3xl">
          <h2 className="mb-8 text-5xl font-extrabold leading-tight text-text-dark dark:text-text-light md:text-6xl">
            Join Us
          </h2>
          <p className="text-xl font-light text-text-dark/80 dark:text-text-light/80 md:text-2xl">
            Be part of our mission to solve humanity's most pressing challenges through innovation and collaboration.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Left column: Newsletter Subscription */}
          <div>
            <NewsletterSubscriptionForm />
            
            {/* Impact Stats */}
            <div className="mt-12 space-y-6">
              <div className="text-sm font-semibold uppercase tracking-widest text-secondary">
                Join Our Growing Community
              </div>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="rounded-lg bg-neutral-light/10 dark:bg-neutral-dark/10 p-6 text-center">
                  <div className="mb-2 flex justify-center">
                    <div className="rounded-full bg-secondary/20 p-2">
                      <Users size={24} className="text-secondary" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-secondary">5,000+</div>
                  <div className="text-sm text-text-dark/70 dark:text-text-light/70">
                    Community Members
                  </div>
                </div>
                
                <div className="rounded-lg bg-neutral-light/10 dark:bg-neutral-dark/10 p-6 text-center">
                  <div className="mb-2 flex justify-center">
                    <div className="rounded-full bg-secondary/20 p-2">
                      <Mail size={24} className="text-secondary" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-secondary">250+</div>
                  <div className="text-sm text-text-dark/70 dark:text-text-light/70">
                    Newsletter Subscribers
                  </div>
                </div>
                
                <div className="rounded-lg bg-neutral-light/10 dark:bg-neutral-dark/10 p-6 text-center">
                  <div className="mb-2 flex justify-center">
                    <div className="rounded-full bg-secondary/20 p-2">
                      <Globe size={24} className="text-secondary" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-secondary">6</div>
                  <div className="text-sm text-text-dark/70 dark:text-text-light/70">
                    Continents Reached
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right column: Contact Form */}
          <div>
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}
