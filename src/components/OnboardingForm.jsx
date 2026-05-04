import { memo, useCallback, useState } from 'react';

const OnboardingForm = ({
  selectedDate,
  employees,
  addOnboarding
}) => {
  // Local state for form inputs to prevent parent re-renders on every keystroke
  const [localSelectedEmployee, setLocalSelectedEmployee] = useState('');
  const [localClientName, setLocalClientName] = useState('');
  const [localAccountNumber, setLocalAccountNumber] = useState('');

  const handleEmployeeChange = useCallback((e) => {
    setLocalSelectedEmployee(e.target.value);
  }, []);

  const handleClientChange = useCallback((e) => {
    setLocalClientName(e.target.value);
  }, []);

  const handleAccountChange = useCallback((e) => {
    setLocalAccountNumber(e.target.value);
  }, []);

  const handleSubmit = useCallback(() => {
    if (localSelectedEmployee && localClientName.trim() && localAccountNumber.trim()) {
      addOnboarding({
        selectedEmployee: localSelectedEmployee,
        clientName: localClientName,
        accountNumber: localAccountNumber
      });

      // Clear form after successful submission
      setLocalClientName('');
      setLocalAccountNumber('');
    }
  }, [localSelectedEmployee, localClientName, localAccountNumber, addOnboarding]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  }, [handleSubmit]);

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
            value={localSelectedEmployee}
            onChange={handleEmployeeChange}
            className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent backdrop-blur-sm transition-colors duration-150 will-change-auto"
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
            value={localClientName}
            onChange={handleClientChange}
            placeholder="Enter client name..."
            className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent backdrop-blur-sm transition-colors duration-150 will-change-auto"
          />
        </div>

        <div>
          <label className="text-white text-sm font-medium mb-2 block">Account Number</label>
          <input
            type="text"
            value={localAccountNumber}
            onChange={handleAccountChange}
            onKeyDown={handleKeyDown}
            placeholder="Enter account number..."
            className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent backdrop-blur-sm transition-colors duration-150 will-change-auto"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!localSelectedEmployee || !localClientName.trim() || !localAccountNumber.trim()}
          className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-blue-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 shadow-lg hover:shadow-blue-500/25 will-change-auto"
        >
          Add Onboarding
        </button>
      </div>
    </div>
  );
};

export default memo(OnboardingForm);
