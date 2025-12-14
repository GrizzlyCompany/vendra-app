import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Property } from '@/types';

export function useFavorites() {
  const [favorites, setFavorites] = useState<Property[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Initialize user and load favorites
  useEffect(() => {
    let active = true;

    async function init() {
      try {
        const { data: session } = await supabase.auth.getSession();
        const uid = session.session?.user?.id;
        
        if (!uid || !active) return;
        
        setUserId(uid);
        await loadFavorites(uid);
      } catch (error) {
        console.error('Error initializing favorites:', error);
      }
    }

    init();
    return () => { active = false; };
  }, []);

  // Load user's saved properties
  const loadFavorites = async (uid?: string) => {
    if (!uid && !userId) return;
    
    setLoading(true);
    try {
      const targetUserId = uid || userId;
      
      const { data, error } = await supabase
        .from('saved_properties')
        .select(`
          created_at,
          property_id,
          properties!inner (
            id,
            title,
            description,
            price,
            location,
            address,
            images,
            type,
            owner_id,
            currency,
            inserted_at
          )
        `)
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const savedProperties = (data || []).map(item => item.properties as unknown as Property);
      const savedIds = new Set(savedProperties.map(p => p.id));
      
      setFavorites(savedProperties);
      setFavoriteIds(savedIds);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add property to favorites
  const addToFavorites = async (propertyId: string) => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('saved_properties')
        .insert({
          user_id: userId,
          property_id: propertyId
        });

      if (error) throw error;

      // Update local state
      setFavoriteIds(prev => new Set([...prev, propertyId]));
      
      // Reload favorites to get the complete property data
      await loadFavorites();
      
      return true;
    } catch (error) {
      console.error('Error adding to favorites:', error);
      return false;
    }
  };

  // Remove property from favorites
  const removeFromFavorites = async (propertyId: string) => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('saved_properties')
        .delete()
        .eq('user_id', userId)
        .eq('property_id', propertyId);

      if (error) throw error;

      // Update local state
      setFavoriteIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(propertyId);
        return newSet;
      });
      
      setFavorites(prev => prev.filter(p => p.id !== propertyId));
      
      return true;
    } catch (error) {
      console.error('Error removing from favorites:', error);
      return false;
    }
  };

  // Toggle favorite status
  const toggleFavorite = async (propertyId: string) => {
    if (!userId) return false;

    const isFavorite = favoriteIds.has(propertyId);
    
    if (isFavorite) {
      return await removeFromFavorites(propertyId);
    } else {
      return await addToFavorites(propertyId);
    }
  };

  // Check if property is favorite
  const isFavorite = (propertyId: string) => {
    return favoriteIds.has(propertyId);
  };

  return {
    favorites,
    favoriteIds,
    loading,
    userId,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    isFavorite,
    loadFavorites: () => loadFavorites(userId || undefined)
  };
}