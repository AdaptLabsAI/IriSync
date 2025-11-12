import { redirect } from 'next/navigation';

export default function NewTestimonialPage() {
  redirect('/admin/testimonials/new');
  return null;
} 