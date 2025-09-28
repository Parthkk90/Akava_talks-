import React from 'react';
import { NavLink } from 'react-router-dom';
import { HomeIcon, CpuChipIcon, DocumentTextIcon, BeakerIcon, CodeBracketIcon } from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Home', href: '/', icon: HomeIcon },
  { name: 'Models', href: '/models', icon: CpuChipIcon },
  { name: 'Datasets', href: '/datasets', icon: DocumentTextIcon },
  { name: 'Training', href: '/training', icon: BeakerIcon },
  { name: 'Query', href: '/query', icon: CodeBracketIcon },
];

const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-gray-800 text-white p-4">
      <nav className="space-y-2">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`
            }
          >
            <item.icon className="h-6 w-6 mr-3" aria-hidden="true" />
            {item.name}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
