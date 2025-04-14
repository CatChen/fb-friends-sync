//
//  main.swift
//  fb-friends-sync
//
//  Created by Cat Chen on 4/12/25.
//

import Foundation
import Contacts

let contactStore = CNContactStore()
let status = CNContactStore.authorizationStatus(for: .contacts)

switch status {
case .notDetermined:
    // The person hasn't yet decided whether the app may access contact data.
    // Initialize the contact store.

    // Request access to contacts.
    do {
        try await contactStore.requestAccess(for: .contacts)
        print("Full access granted")
    } catch {
        // Handle the error.
        print("Access denied")
        exit(1)
    }
    break
case .restricted:
    // The app isn't authorized and the person can't authorize the app due to restrictions.
    print("Access restricted")
    exit(1)
case .denied:
    // The person explicitly denies access to contact data.
    print("Access denied")
    exit(1)
case .authorized:
    // The person authorizes access to all contact data.
    break
@unknown default:
    break;
}

let fetchRequest = CNContactFetchRequest(keysToFetch: [
    CNContactIdentifierKey,
    CNContactGivenNameKey,
    CNContactFamilyNameKey,
    CNContactOrganizationNameKey,
    CNContactPhoneNumbersKey,
    CNContactEmailAddressesKey,
    CNContactSocialProfilesKey,
] as [CNKeyDescriptor])

var contactArray: [[String: Any]] = [];

try contactStore.enumerateContacts(with: fetchRequest) {
    contact, _ in
    var contactObject: [String: Any] = [
        "identifier": contact.identifier,
    ];
    if (contact.organizationName.isEmpty || !contact.givenName.isEmpty || !contact.familyName.isEmpty) {
        print("\(contact.givenName) \(contact.familyName) (\(contact.identifier))")
        contactObject["givenName"] = contact.givenName
        contactObject["familyName"] = contact.familyName
    } else {
        print("\(contact.organizationName) (\(contact.identifier))")
        contactObject["organizationName"] = contact.organizationName
    }
    for phoneNumber in contact.phoneNumbers {
        let number = phoneNumber.value.stringValue
        print("  \(number)")
        contactObject["numbers"] = contactObject["numbers"] as? [String] ?? [] + [number]
    }
    for emailAddress in contact.emailAddresses {
        let email = emailAddress.value as String
        print("  \(email)")
        contactObject["emails"] = contactObject["emails"] as? [String] ?? [] + [email]
    }
    for socialProfile in contact.socialProfiles {
        if (socialProfile.value.service == "Facebook") {
            print("  \(socialProfile.value.username)")
            contactObject["facebookUsernames"] = contactObject["facebookUsernames"] as? [String] ?? [] + [socialProfile.value.username]
        }
    }
    contactArray.append(contactObject)
}

let currentWorkingDirectory = URL(filePath: FileManager.default.currentDirectoryPath)
let filename = currentWorkingDirectory.appendingPathComponent("artifacts").appendingPathComponent("contacts").appendingPathExtension("json")
do {
    let jsonData = try JSONSerialization.data(withJSONObject: contactArray, options: .prettyPrinted)
    try jsonData.write(to: filename, options: [.atomicWrite])
    print("Contacts saved to \(filename.path)")
} catch {
    print("Failed to save contacts to \(filename.path)")
}
