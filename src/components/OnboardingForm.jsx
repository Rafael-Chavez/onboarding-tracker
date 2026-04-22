import { memo } from 'react';

import { useState, useCallback } from 'react';

const OnboardingForm = ({
  selectedDate,
  employees,
  addOnboarding
}) => {
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [clientName, setClientName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  const handleSubmit = useCallback(async () => {
    if (!selectedEmployee || !clientName.trim() || !accountNumber.trim()) return;

    const success = await addOnboarding({
      employeeId: selectedEmployee,
      clientName,
      accountNumber
    });

    if (success) {
      setClientName('');
      setAccountNumber('');
    }
  }, [selectedEmployee, clientName, accountNumber, addOnboarding]);

  return (
    <div className="backdrop-blur-md bg-white/10 rounded-2xl border border-white/20 p-6 shadow-2xl">
      <h3 className="text-xl font-bold text-white mb-2">
        Add Onboarding
      </h3>
      <p className="text-blue-200 text-sm mb-6">
        {selectedDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          year: selectedDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        })}
      </p>

      <div className="space-y-4">
        <div>
          <label className="text-white text-sm font-medium mb-2 block">Employee</label>
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent backdrop-blur-sm"
          >
            <option value="" className="text-gray-800">Select Employee</option>
            {employees.map(employee => (
              <option key={employee.id} value={employee.id} className="text-gray-800">
                {employee.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-white text-sm font-medium mb-2 block">Client Name</label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Enter client name..."
            className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent backdrop-blur-sm"
          />
        </div>

        <div>
          <label className="text-white text-sm font-medium mb-2 block">Account Number</label>
          <input
            type="text"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Enter account number..."
            className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent backdrop-blur-sm"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!selectedEmployee || !clientName.trim() || !accountNumber.trim()}
          className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-blue-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-blue-500/25"
        >
          Add Onboarding
        </button>
      </div>
    </div>
  );
};

export default memo(OnboardingForm);
