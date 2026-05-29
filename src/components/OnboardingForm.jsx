import { memo, useState, useCallback } from 'react';

const OnboardingForm = ({
  selectedDate,
  employees,
  addOnboarding
}) => {
  const [localEmployee, setLocalEmployee] = useState('');
  const [localClientName, setLocalClientName] = useState('');
  const [localAccountNumber, setLocalAccountNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmployeeChange = useCallback((e) => {
    setLocalEmployee(e.target.value);
  }, []);

  const handleClientChange = useCallback((e) => {
    setLocalClientName(e.target.value);
  }, []);

  const handleAccountChange = useCallback((e) => {
    setLocalAccountNumber(e.target.value);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!localEmployee || !localClientName.trim() || !localAccountNumber.trim() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await addOnboarding({
        employeeId: localEmployee,
        clientName: localClientName,
        accountNumber: localAccountNumber
      });

      if (success) {
        setLocalClientName('');
        setLocalAccountNumber('');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [localEmployee, localClientName, localAccountNumber, addOnboarding, isSubmitting]);

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
            value={localEmployee}
            onChange={handleEmployeeChange}
            disabled={isSubmitting}
            className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent transition-colors disabled:opacity-50"
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
            disabled={isSubmitting}
            placeholder="Enter client name..."
            className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent transition-colors disabled:opacity-50"
          />
        </div>

        <div>
          <label className="text-white text-sm font-medium mb-2 block">Account Number</label>
          <input
            type="text"
            value={localAccountNumber}
            onChange={handleAccountChange}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
            placeholder="Enter account number..."
            className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent transition-colors disabled:opacity-50"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!localEmployee || !localClientName.trim() || !localAccountNumber.trim() || isSubmitting}
          className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-blue-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-blue-500/25"
        >
          {isSubmitting ? 'Adding...' : 'Add Onboarding'}
        </button>
      </div>
    </div>
  );
};

export default memo(OnboardingForm);
