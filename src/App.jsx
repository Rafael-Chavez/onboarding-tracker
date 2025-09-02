import { useState } from 'react'

function App() {
  const [employees] = useState([
    { id: 1, name: 'Rafael' },
    { id: 2, name: 'Danreb' },
    { id: 3, name: 'Jim' },
    { id: 4, name: 'Marc' },
    { id: 5, name: 'Steve' }
  ])
  
  const [onboardings, setOnboardings] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [clientName, setClientName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')

  const addOnboarding = () => {
    if (selectedEmployee && clientName.trim() && accountNumber.trim()) {
      // Find existing onboardings for this client to determine session number
      const clientOnboardings = onboardings.filter(ob => 
        ob.clientName.toLowerCase() === clientName.trim().toLowerCase()
      )
      const sessionNumber = clientOnboardings.length + 1
      
      const newOnboarding = {
        id: Date.now(),
        employeeId: parseInt(selectedEmployee),
        employeeName: employees.find(e => e.id === parseInt(selectedEmployee))?.name,
        clientName: clientName.trim(),
        accountNumber: accountNumber.trim(),
        sessionNumber,
        date: new Date().toISOString().split('T')[0],
        month: new Date().toISOString().slice(0, 7)
      }
      setOnboardings([...onboardings, newOnboarding])
      setClientName('')
      setAccountNumber('')
    }
  }

  const deleteOnboarding = (id) => {
    setOnboardings(onboardings.filter(ob => ob.id !== id))
  }

  const months = [...new Set(onboardings.map(ob => ob.month))].sort().reverse()
  
  const filteredOnboardings = selectedMonth 
    ? onboardings.filter(ob => ob.month === selectedMonth)
    : onboardings

  const getEmployeeStats = (employeeId) => {
    const employeeOnboardings = filteredOnboardings.filter(ob => ob.employeeId === employeeId)
    return employeeOnboardings.length
  }

  const totalOnboardings = filteredOnboardings.length

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-800 text-center mb-8">
          Employee Onboarding Tracker
        </h1>
        
        <div className="mb-8 p-4 bg-blue-50 rounded-lg">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Add New Onboarding</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Employee</option>
              {employees.map(employee => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
            
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Client name..."
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addOnboarding()}
              placeholder="Account number..."
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <button
              onClick={addOnboarding}
              disabled={!selectedEmployee || !clientName.trim() || !accountNumber.trim()}
              className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Add Onboarding
            </button>
          </div>
        </div>

        <div className="mb-6 flex justify-between items-center">
          <div className="flex gap-4 items-center">
            <h2 className="text-xl font-semibold text-gray-800">Monthly Stats</h2>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Months</option>
              {months.map(month => (
                <option key={month} value={month}>
                  {new Date(month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm text-gray-600">
            Total: {totalOnboardings} onboardings
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          {employees.map(employee => {
            const count = getEmployeeStats(employee.id)
            return (
              <div key={employee.id} className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg text-center">
                <h3 className="font-semibold text-gray-800 mb-2">{employee.name}</h3>
                <div className="text-2xl font-bold text-blue-600">{count}</div>
                <div className="text-sm text-gray-600">onboardings</div>
              </div>
            )
          })}
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Onboardings</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredOnboardings.length > 0 ? (
              [...filteredOnboardings].reverse().map(onboarding => (
                <div
                  key={onboarding.id}
                  className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-medium text-gray-800">{onboarding.clientName}</div>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                        Session #{onboarding.sessionNumber}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      Account: {onboarding.accountNumber}
                    </div>
                    <div className="text-sm text-gray-600">
                      by {onboarding.employeeName} • {new Date(onboarding.date).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteOnboarding(onboarding.id)}
                    className="text-red-500 hover:text-red-700 focus:outline-none px-3 py-1"
                  >
                    Delete
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No onboardings recorded yet. Add one above!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
