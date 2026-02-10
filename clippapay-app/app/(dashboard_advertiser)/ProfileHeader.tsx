import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const scale = width / 428; // Based on your Figma width

export default function ProfileHeader() {
  return (
    <View style={styles.container}>
      {/* Profile Image */}
      <Image
        source={require('../../assets/images/default_profile.png')} // Replace with your asset
        style={styles.profileImage}
      />

      {/* Texts */}
      <View style={styles.textContainer}>
        <Text style={styles.greeting}>Good Evening!</Text>
        <Text style={styles.name}>Amanda Waller</Text>
        <View style={styles.advertiserBadge}>
          <Text style={styles.advertiserText}>Advertiser</Text>
        </View>
      </View>

      {/* Notification Bell */}
      <TouchableOpacity style={styles.notificationContainer}>
        <Ionicons name="notifications-outline" size={21 * scale} color="#000" />
        <View style={styles.notificationDot} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    top: 0 * scale,
    left: 0,
    width: 430 * scale,
    height: 130 * scale,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28 * scale,
    // Add shadow if needed for elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileImage: {
    width: 58 * scale,
    height: 58 * scale,
    borderRadius: 30 * scale,
  },
  textContainer: {
    marginLeft: 14 * scale, // Adjusted for spacing between image and text
  },
  greeting: {
    // fontFamily: 'OpenSans',
    fontWeight: '400',
    fontSize: 12 * scale,
    lineHeight: 12 * scale * 1.4,
    letterSpacing: 0.2 * scale,
    color: '#000',
  },
  name: {
    // fontFamily: 'OpenSans',
    fontWeight: '700',
    fontSize: 20 * scale,
    lineHeight: 20 * scale * 1.4,
    letterSpacing: 0.2 * scale,
    color: '#000',
  },
  advertiserBadge: {
    width: 71 * scale,
    height: 19 * scale,
    borderRadius: 20 * scale,
    backgroundColor: '#F8312F33', // Semi-transparent red
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4 * scale, // Spacing from name
  },
  advertiserText: {
    fontSize: 12 * scale,
    color: '#F8312F', // Assuming red text
  },
  notificationContainer: {
    position: 'absolute',
    right: 28 * scale,
    top: 50 * scale,
    width: 27 * scale,
    height: 27 * scale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 3 * scale,
    right: 4 * scale, // Adjusted to match Figma (left:15px relative to bell)
    width: 8 * scale,
    height: 8 * scale,
    borderRadius: 4 * scale,
    backgroundColor: '#F8312F', // Red ellipse
  },
});