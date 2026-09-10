import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Droplet, Heart, Shield, Zap, Users, Building2, MapPin, Clock, Radio, ChevronRight, ArrowRight, Activity } from 'lucide-react';

function AnimatedCounter({ target, suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const startTime = Date.now();
          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(target * eased));
            if (progress < 1) requestAnimationFrame(animate);
          };
          animate();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

function WorkflowStep({ number, title, description, icon: Icon, isLast }) {
  return (
    <div className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 text-sm font-bold text-white shadow-lg shadow-red-500/20">
          {number}
        </div>
        {!isLast && <div className="mt-2 h-full w-0.5 bg-gradient-to-b from-red-200 to-transparent" />}
      </div>
      <div className="pb-8">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-red-500" />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <p className="mt-1 text-sm text-gray-600 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <header className="fixed top-0 z-50 w-full border-b border-gray-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/20">
              <Droplet className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">LifeLink</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/nearby" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors sm:block">
              Nearby
            </Link>
            <Link to="/camps" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors sm:block">
              Camps
            </Link>
            <Link to="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Login
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-500/20 hover:shadow-red-500/30 transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 pb-20 pt-32 sm:px-6">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-red-100/60 blur-[120px]" />
          <div className="absolute bottom-0 right-0 h-[300px] w-[400px] rounded-full bg-orange-100/50 blur-[80px]" />
          <div className="absolute top-20 left-0 h-[200px] w-[300px] rounded-full bg-pink-100/40 blur-[80px]" />
        </div>

        <div className="relative mx-auto max-w-5xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-sm text-red-600 font-medium">
            <Activity className="h-4 w-4" />
            Real-time Emergency Donor Coordination
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
            Smart Blood Donation
            <span className="mt-2 block bg-gradient-to-r from-red-500 via-red-600 to-orange-500 bg-clip-text text-transparent">
              & Emergency Response
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-500 leading-relaxed">
            LifeLink connects hospitals with eligible donors in real time during emergencies —
            using intelligent filtering, smart prioritization, and automatic radius expansion
            to save lives when every second counts.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              to="/register"
              className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-8 py-3.5 font-semibold text-white shadow-xl shadow-red-500/20 hover:shadow-red-500/30 transition-all"
            >
              Become a Donor <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/register"
              className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-8 py-3.5 font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
            >
              Register Hospital
            </Link>
          </div>
        </div>
      </section>

      {/* Emergency Workflow */}
      <section className="border-t border-gray-100 bg-gray-50/80 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Emergency Workflow</h2>
            <p className="mt-3 text-gray-500">How LifeLink handles a blood emergency from start to fulfillment</p>
          </div>

          <div className="mt-14 grid gap-12 lg:grid-cols-2">
            <div className="space-y-1">
              {[
                { icon: Building2, title: 'Hospital Creates Request', description: 'A verified hospital raises an emergency blood request specifying blood group, units needed, and urgency level.' },
                { icon: Zap, title: 'Smart Donor Filtering', description: 'The system instantly filters eligible donors by blood compatibility, availability, cooldown period, weight, and age.' },
                { icon: MapPin, title: 'Proximity-Based Ranking', description: 'Eligible donors are ranked using a weighted scoring algorithm: distance (40%), eligibility (25%), availability (20%), and response history (15%).' },
                { icon: Radio, title: 'Push Notifications Sent', description: 'Top-ranked donors within the initial radius receive real-time push notifications via Firebase Cloud Messaging.' },
                { icon: Clock, title: 'Automatic Radius Expansion', description: 'If not enough donors respond within the configured wait time, the search radius automatically expands to reach more donors.' },
                { icon: Heart, title: 'Real-Time Fulfillment', description: 'Hospitals track donor responses live. Once enough donors accept, the request is marked fulfilled and notifications stop.' },
              ].map((step, i, arr) => (
                <WorkflowStep key={step.title} number={i + 1} {...step} isLast={i === arr.length - 1} />
              ))}
            </div>

            {/* Visual Card */}
            <div className="flex items-center justify-center">
              <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm font-medium text-red-600">LIVE EMERGENCY</span>
                </div>
                <div className="space-y-4">
                  <div className="rounded-xl bg-red-50 p-4">
                    <div className="text-3xl font-bold text-gray-900">O+</div>
                    <div className="text-sm text-gray-600">3 units required urgently</div>
                    <div className="mt-1 text-xs text-gray-400">City General Hospital, Mumbai</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-blue-50 p-3 text-center">
                      <div className="text-2xl font-bold text-blue-600">12</div>
                      <div className="text-xs text-blue-500">Notified</div>
                    </div>
                    <div className="rounded-lg bg-green-50 p-3 text-center">
                      <div className="text-2xl font-bold text-green-600">3</div>
                      <div className="text-xs text-green-500">Accepted</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[
                      { name: 'Amit S.', distance: '2.1 km', score: 87, status: 'Accepted', color: 'bg-green-500' },
                      { name: 'Priya R.', distance: '3.4 km', score: 82, status: 'Accepted', color: 'bg-green-500' },
                      { name: 'Rahul M.', distance: '4.8 km', score: 76, status: 'Arrived', color: 'bg-teal-500' },
                    ].map((donor) => (
                      <div key={donor.name} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                        <div>
                          <span className="text-sm font-medium text-gray-800">{donor.name}</span>
                          <span className="ml-2 text-xs text-gray-400">{donor.distance} • Score: {donor.score}</span>
                        </div>
                        <span className={`${donor.color} rounded-full px-2 py-0.5 text-[10px] font-medium text-white`}>
                          {donor.status}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg bg-orange-50 p-2 text-center text-xs text-orange-600">
                    Radius expanded: 5 km → 10 km → 20 km
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="border-t border-gray-100 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-3xl font-bold text-gray-900 sm:text-4xl">Platform Features</h2>
          <p className="mt-3 text-center text-gray-500">Everything needed for a complete blood donation ecosystem</p>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Users, title: 'For Donors', color: 'from-blue-500 to-blue-600', bgLight: 'bg-blue-50 hover:border-blue-200',
                items: ['Control your availability', 'Track donation history', 'Respond to emergencies instantly', 'Book appointments at blood banks', 'Register for donation camps'],
              },
              {
                icon: Building2, title: 'For Hospitals', color: 'from-red-500 to-red-600', bgLight: 'bg-red-50 hover:border-red-200',
                items: ['Create emergency requests', 'Real-time donor tracking', 'Donor response monitoring', 'Blood availability search', 'Emergency verification system'],
              },
              {
                icon: Shield, title: 'For Blood Banks', color: 'from-green-500 to-green-600', bgLight: 'bg-green-50 hover:border-green-200',
                items: ['Inventory management', 'Appointment slot scheduling', 'Organize donation camps', 'Record donations', 'Expiry tracking & alerts'],
              },
              {
                icon: Zap, title: 'Smart Features', color: 'from-orange-500 to-orange-600', bgLight: 'bg-orange-50 hover:border-orange-200',
                items: ['Eligibility engine with configurable rules', 'Weighted donor scoring algorithm', 'Automatic radius expansion', 'FCM push notifications', 'ML-ready scoring pipeline'],
              },
            ].map(({ icon: Icon, title, color, bgLight, items }) => (
              <div key={title} className={`group rounded-2xl border border-gray-200 ${bgLight} p-6 transition-all shadow-sm hover:shadow-md`}>
                <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${color} shadow-lg`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
                <ul className="mt-3 space-y-2">
                  {items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                      <ChevronRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-gray-100 bg-gray-50/80 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-center text-xs text-gray-400 uppercase tracking-wider">Platform Capabilities</p>
          <div className="mt-8 grid grid-cols-2 gap-8 sm:grid-cols-4">
            {[
              { value: 4, suffix: '', label: 'Expansion Stages', sub: '5 → 10 → 20 → 50 km' },
              { value: 4, suffix: '', label: 'Scoring Factors', sub: 'Distance • Eligibility • Availability • History' },
              { value: 8, suffix: '', label: 'Blood Groups', sub: 'All ABO+Rh types supported' },
              { value: 5, suffix: '', label: 'User Roles', sub: 'Donor • Hospital • Bank • NGO • Admin' },
            ].map(({ value, suffix, label, sub }) => (
              <div key={label} className="text-center">
                <div className="text-4xl font-bold text-gray-900">
                  <AnimatedCounter target={value} suffix={suffix} />
                </div>
                <div className="mt-1 text-sm font-medium text-gray-700">{label}</div>
                <div className="mt-0.5 text-xs text-gray-400">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Ready to save lives?</h2>
          <p className="mt-4 text-gray-500">
            Join LifeLink today and become part of an intelligent emergency response network.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/register"
              className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-8 py-3.5 font-semibold text-white shadow-xl shadow-red-500/20 hover:shadow-red-500/30 transition-all"
            >
              Create Account <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/blood-search"
              className="rounded-xl border border-gray-300 bg-white px-8 py-3.5 font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
            >
              Search Blood Availability
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-red-600">
                <Droplet className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-gray-700">LifeLink</span>
            </div>
            <p className="text-center text-xs text-gray-400">
              Smart Blood Donation & Emergency Response Platform.
              Eligibility screening is informational only — final eligibility is determined by medical professionals.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
