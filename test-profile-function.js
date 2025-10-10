// Test script to verify the processProfileData function fix
const fs = require('fs');
const path = require('path');

// Read the profile page file
const profilePagePath = path.join(__dirname, 'src', 'app', 'profile', 'page.tsx');
const profilePageContent = fs.readFileSync(profilePagePath, 'utf8');

// Check if the function is defined inside the component
const functionInsideComponent = profilePageContent.includes(
  'const processProfileData = async (profileData: any, authUser: any, userId: string) => {'
);

// Check if the function is called correctly
const functionCalledCorrectly = profilePageContent.includes(
  'processProfileData(profileData, authUser, uid)'
);

// Check if the old function definition is removed (outside component)
const oldFunctionRemoved = !profilePageContent.includes(
  'const processProfileData = async (profileData: any, authUser: any, userId: string) => {'
) || profilePageContent.split('const processProfileData = async').length <= 2;

console.log('Testing profile function fix...');
console.log('Function defined inside component:', functionInsideComponent);
console.log('Function called correctly:', functionCalledCorrectly);
console.log('Only one function definition exists:', oldFunctionRemoved);

if (functionInsideComponent && functionCalledCorrectly) {
  if (functionInsideComponent && functionCalledCorrectly && oldFunctionRemoved) {
  console.log('\n✅ Profile function fix verified successfully!');
  console.log('The "setProfile is not defined" error should be resolved.');
} else {
  console.log('\n❌ Profile function fix verification failed!');
  console.log('Please check the processProfileData function implementation.');
  process.exit(1);
}
} else {
  console.log('\n❌ Profile function fix verification failed!');
  console.log('Please check the processProfileData function implementation.');
  process.exit(1);
}