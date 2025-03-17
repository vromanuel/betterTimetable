import { FaTwitter, FaFacebook, FaLinkedin } from 'react-icons/fa';

export default function Footer() {
  return (
    <footer className="bg-base-100 bg-blue-1400 text-white text-center py-4 h-48">
      <p>© 2025 Code Network. All rights reserved.</p>
      <div className="mt-6">
        <a href="/about" className="mx-2 hover:text-white">About Us</a>
        <a href="/contact" className="mx-2 hover:text-white">Contact</a>
        <a href="/privacy-policy" className="mx-2 hover:text-white">Privacy Policy</a>
      </div>
    </footer>
  );
}
