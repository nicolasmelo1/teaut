/**
 * From all of the profile types, retrieves if the profile of a specific user is admin or not.
 * 
 * @param {Array<{
 *     id: number,
 *     name: string,
 *     canEdit: boolean
 * }>} profileTypes - An array of all of the profile types the platform does support
 * @param {number} profileTypeId - The id of the profileType to check if is an admin or not
 * 
 * @returns {boolean} - If the profileType is an admin return true, otherwise false.
 */
export default function isAdmin(profileTypes, profileTypeId) {
    const profileType = profileTypes.find(profileType => profileType.id === profileTypeId)
    if (profileType !== undefined) {
        return profileType.name === 'admin'
    } else {
        return false
    }
}